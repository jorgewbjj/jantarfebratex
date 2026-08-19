/**
 * FloorMap — DON CONCEPT
 *
 * Uses the actual PDF floor plan as a background image (1600×1453px).
 * Transparent interactive SVG overlays are positioned pixel-perfect
 * over each numbered table circle in the original plan.
 *
 * Approach:
 *  - <img> background = the PDF render (don_concept_hall_web.png)
 *  - <svg> overlay (same dimensions) = transparent circles over each table
 *  - The circles show company name, guest count, and status colour
 *  - No drawn structural elements — the PDF image handles all of that
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FLOOR_PLAN_IMAGE_URL,
  TABLE_POSITIONS,
  TABLE_POSITION_MAP,
  findTableSetForGroup,
} from "@/lib/floorLayout";
import { useSeating } from "@/contexts/SeatingContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ZoomIn, ZoomOut, Maximize2, Move, RotateCcw, Plus, Minus } from "lucide-react";
import SuggestNeighborDialog from "@/components/SuggestNeighborDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloorMapProps {
  eventId: number;
  tables: Array<{
    id: number;
    tableNumber: number;
    companyName: string | null;
    companyNames: string | null;
    capacity: number;
    positionX: number | null;
    positionY: number | null;
    radiusOverride: number | null;
  }>;
  guestCounts: Map<number, number>;
  allInvitesDelivered?: Map<number, boolean>;
  inviteStats?: Map<number, { delivered: number; total: number }>;
  onTableClick: (tableId: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTableStatus(count: number, capacity: number): "empty" | "partial" | "full" {
  if (count === 0) return "empty";
  if (count >= capacity) return "full";
  return "partial";
}

function parseCompanyNames(companyNames: string | null, companyName: string | null): string[] {
  if (companyNames) {
    try {
      const parsed = JSON.parse(companyNames);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    } catch { /* fall through */ }
  }
  if (companyName) return [companyName];
  return [];
}

function formatCompanyDisplay(names: string[], maxChars: number): { line1: string; line2: string | null } {
  if (names.length === 0) return { line1: "", line2: null };
  if (names.length === 1) {
    const n = names[0];
    return { line1: n.length > maxChars ? n.slice(0, maxChars - 1) + "…" : n, line2: null };
  }
  const mid  = names[0].length > maxChars ? names[0].slice(0, maxChars - 1) + "…" : names[0];
  const rest = names.slice(1).join(" / ");
  return { line1: mid, line2: ("/ " + (rest.length > maxChars ? rest.slice(0, maxChars - 1) + "…" : rest)) };
}

// ─── Table visual radii ───────────────────────────────────────────────────────
// These define the interactive overlay circle size over each table in the image.
// Normal tables (10-seat): radius ~36px at 1600px canvas width
// Large tables (20-seat):  radius ~58px (visually larger to match the PDF)
const TABLE_R_NORMAL = 36;
const TABLE_R_LARGE  = 58;

// ─── Colour palette ───────────────────────────────────────────────────────────
const STATUS_FILL:   Record<string, string> = {
  empty:   "rgba(245,241,232,0.0)",  // fully transparent — show PDF background
  partial: "rgba(219,234,254,0.72)", // blue tint
  full:    "rgba(187,247,208,0.72)", // green tint
};
const STATUS_FILL_ALL_DELIVERED = "rgba(22,101,52,0.82)"; // dark green when all invites delivered
const STATUS_STROKE: Record<string, string> = {
  empty:   "rgba(184,176,164,0.5)",
  partial: "#93c5fd",
  full:    "#4ade80",
};
const STATUS_STROKE_ALL_DELIVERED = "#166534"; // dark green stroke

// ─── Zoom constants ───────────────────────────────────────────────────────────
const MIN_ZOOM  = 0.3;
const MAX_ZOOM  = 5.0;
const ZOOM_STEP = 0.15;

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloorMap({ eventId: _eventId, tables, guestCounts, allInvitesDelivered, inviteStats, onTableClick }: FloorMapProps) {
  const {
    selectedTableId,
    draggedGuest, setDraggedGuest,
    draggedCompany, setDraggedCompany,
    dragOverTableId, setDragOverTableId,
    pendingCompanyDrop, setPendingCompanyDrop,
    highlightedTableIds, setHighlightedTableIds,
    searchHighlightedTableIds,
  } = useSeating();

  const utils = trpc.useUtils();
  const [tooltip, setTooltip] = useState<{ tableId: number } | null>(null);

  // ── Zoom / Pan ────────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(0.55);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const isPanning       = useRef(false);
  const panStart        = useRef({ x: 0, y: 0 });
  const panOrigin       = useRef({ x: 0, y: 0 });
  const containerRef    = useRef<HTMLDivElement>(null);

  // ── Edit Mode (position adjustment) ─────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
  const isDraggingTable = useRef(false);
  const dragTableStart  = useRef({ x: 0, y: 0 });
  const dragTableOrigin = useRef({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [localRadii, setLocalRadii] = useState<Map<number, number>>(new Map());

  const updatePositionMutation = trpc.tables.updatePosition.useMutation({
    onSuccess: () => utils.tables.list.invalidate(),
  });
  const resetPositionMutation = trpc.tables.resetPosition.useMutation({
    onSuccess: () => {
      utils.tables.list.invalidate();
      toast.success("Posi\u00e7\u00e3o resetada");
    },
  });

  // Get effective position for a table (DB override > local override > default)
  const getEffectivePosition = useCallback((table: FloorMapProps["tables"][0]) => {
    // Local drag position takes priority (during drag)
    const local = localPositions.get(table.id);
    if (local) return local;
    // DB override
    if (table.positionX !== null && table.positionY !== null) {
      return { x: table.positionX, y: table.positionY };
    }
    // Default from floorLayout.ts
    const defaultPos = TABLE_POSITION_MAP.get(table.tableNumber);
    return defaultPos ? { x: defaultPos.x, y: defaultPos.y } : { x: 0, y: 0 };
  }, [localPositions]);

  const getEffectiveRadius = useCallback((table: FloorMapProps["tables"][0]) => {
    const local = localRadii.get(table.id);
    if (local) return local;
    if (table.radiusOverride !== null) return table.radiusOverride;
    return table.capacity >= 20 ? TABLE_R_LARGE : TABLE_R_NORMAL;
  }, [localRadii]);

  const handleEditTableMouseDown = useCallback((e: React.MouseEvent, tableId: number, currentX: number, currentY: number) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingTable.current = true;
    setEditingTableId(tableId);
    dragTableStart.current = { x: e.clientX, y: e.clientY };
    dragTableOrigin.current = { x: currentX, y: currentY };
  }, [editMode]);

  const handleEditTableMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editMode || !isDraggingTable.current || editingTableId === null) return;
    const dx = (e.clientX - dragTableStart.current.x) / zoom;
    const dy = (e.clientY - dragTableStart.current.y) / zoom;
    const newX = Math.round(dragTableOrigin.current.x + dx);
    const newY = Math.round(dragTableOrigin.current.y + dy);
    setLocalPositions(prev => new Map(prev).set(editingTableId, { x: newX, y: newY }));
  }, [editMode, editingTableId, zoom]);

  const handleEditTableMouseUp = useCallback(() => {
    if (!isDraggingTable.current || editingTableId === null) return;
    isDraggingTable.current = false;
    const pos = localPositions.get(editingTableId);
    if (pos) {
      const table = tables.find(t => t.id === editingTableId);
      const radius = getEffectiveRadius(table!);
      updatePositionMutation.mutate({
        tableId: editingTableId,
        positionX: pos.x,
        positionY: pos.y,
        radiusOverride: radius !== (table!.capacity >= 20 ? TABLE_R_LARGE : TABLE_R_NORMAL) ? radius : null,
      });
    }
  }, [editingTableId, localPositions, tables, getEffectiveRadius, updatePositionMutation]);

  const handleRadiusChange = useCallback((tableId: number, delta: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const current = getEffectiveRadius(table);
    const newR = Math.max(20, Math.min(80, current + delta));
    setLocalRadii(prev => new Map(prev).set(tableId, newR));
    const pos = getEffectivePosition(table);
    updatePositionMutation.mutate({
      tableId,
      positionX: pos.x,
      positionY: pos.y,
      radiusOverride: newR,
    });
  }, [tables, getEffectiveRadius, getEffectivePosition, updatePositionMutation]);

  const handleResetPosition = useCallback((tableId: number) => {
    setLocalPositions(prev => { const m = new Map(prev); m.delete(tableId); return m; });
    setLocalRadii(prev => { const m = new Map(prev); m.delete(tableId); return m; });
    resetPositionMutation.mutate({ tableId });
  }, [resetPositionMutation]);


  const clampPan = useCallback((x: number, y: number, z: number) => {
    const cw = containerRef.current?.clientWidth  ?? CANVAS_WIDTH;
    const ch = containerRef.current?.clientHeight ?? CANVAS_HEIGHT;
    const maxX = Math.max(0, (CANVAS_WIDTH  * z - cw) / 2 + 40);
    const maxY = Math.max(0, (CANVAS_HEIGHT * z - ch) / 2 + 40);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const applyZoom = useCallback((delta: number, cx?: number, cy?: number) => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      if (cx !== undefined && cy !== undefined) {
        setPan((p) => {
          const scale = next / prev;
          const nx = cx + (p.x - cx) * scale;
          const ny = cy + (p.y - cy) * scale;
          return clampPan(nx, ny, next);
        });
      } else {
        setPan((p) => clampPan(p.x, p.y, next));
      }
      return next;
    });
  }, [clampPan]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? e.clientX - rect.left - rect.width  / 2 : 0;
    const cy = rect ? e.clientY - rect.top  - rect.height / 2 : 0;
    applyZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, cx, cy);
  }, [applyZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Mouse pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX, y: e.clientY };
    panOrigin.current = pan;
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan(clampPan(panOrigin.current.x + dx, panOrigin.current.y + dy, zoom));
  }, [zoom, clampPan]);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  // Touch pinch-to-zoom
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMid  = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchMid.current  = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      isPanning.current = true;
      panStart.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panOrigin.current = pan;
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx   = e.touches[1].clientX - e.touches[0].clientX;
      const dy   = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const rect = containerRef.current?.getBoundingClientRect();
      const mid  = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect?.left ?? 0) - (rect?.width  ?? 0) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - (rect?.top  ?? 0) - (rect?.height ?? 0) / 2,
      };
      applyZoom((dist - lastTouchDist.current) * 0.01, mid.x, mid.y);
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setPan(clampPan(panOrigin.current.x + dx, panOrigin.current.y + dy, zoom));
    }
  }, [applyZoom, zoom, clampPan]);

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastTouchDist.current = null;
    lastTouchMid.current  = null;
  }, []);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const assignMutation    = trpc.guests.assign.useMutation({ onSuccess: () => utils.invalidate() });
  const bulkAssignMutation = trpc.guests.bulkAssign.useMutation({ onSuccess: () => utils.invalidate() });

  const handleDragOver = useCallback((e: React.DragEvent, tableId: number) => {
    e.preventDefault();
    setDragOverTableId(tableId);
  }, [setDragOverTableId]);

  const handleDragLeave = useCallback(() => {
    setDragOverTableId(null);
  }, [setDragOverTableId]);

  const handleDrop = useCallback((e: React.DragEvent, tableId: number) => {
    e.preventDefault();
    setDragOverTableId(null);

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const count     = guestCounts.get(tableId) ?? 0;
    const available = table.capacity - count;

    // ── Company group drop ──
    if (draggedCompany) {
      const { companyName, guestIds, guestCount } = draggedCompany;
      setDraggedCompany(null);

      if (guestCount > available) {
        // Build availability map for neighbor suggestion
        const avail = new Map<number, number>();
        for (const t of tables) {
          avail.set(t.tableNumber, t.capacity - (guestCounts.get(t.id) ?? 0));
        }
        const suggestion = findTableSetForGroup(table.tableNumber, guestCount, avail);
        if (suggestion) {
          setPendingCompanyDrop({ companyName, guestIds, guestCount, targetTableNumber: table.tableNumber, suggestedTables: suggestion });
          setHighlightedTableIds(new Set(suggestion.map((s) => s.number)));
        } else {
          toast.error(`Não há mesas próximas com vagas suficientes para ${guestCount} convidados.`);
        }
        return;
      }

      bulkAssignMutation.mutate(
        { guestIds, tableId, companyName },
        {
          onSuccess: () => toast.success(`${guestCount} convidados de "${companyName}" alocados na Mesa ${table.tableNumber}`),
          onError: (err) => toast.error(err.message),
        }
      );
      return;
    }

    // ── Single guest drop ──
    if (draggedGuest) {
      const { guest } = draggedGuest;
      setDraggedGuest(null);
      if (available <= 0) { toast.error(`Mesa ${table.tableNumber} está cheia`); return; }
      assignMutation.mutate({ guestId: guest.id, tableId });
    }
  }, [draggedGuest, draggedCompany, tables, guestCounts, setDraggedGuest, setDraggedCompany, setDragOverTableId, setPendingCompanyDrop, setHighlightedTableIds, assignMutation, bulkAssignMutation]);

  // ── Build a lookup: tableNumber → DB table row ───────────────────────────
  const tableByNumber = new Map(tables.map((t) => [t.tableNumber, t]));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none touch-none"
      style={{ cursor: editMode ? (isDraggingTable.current ? "grabbing" : "move") : (isPanning.current ? "grabbing" : "grab"), background: "#e8e4dc", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onMouseDown={editMode ? undefined : handleMouseDown}
      onMouseMove={(e) => { if (editMode) handleEditTableMouseMove(e); else handleMouseMove(e); }}
      onMouseUp={() => { if (editMode) handleEditTableMouseUp(); else handleMouseUp(); }}
      onMouseLeave={() => { if (editMode) handleEditTableMouseUp(); else handleMouseUp(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Zoom controls ── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        {[
          { icon: ZoomIn,   label: "Ampliar",   action: () => applyZoom(+ZOOM_STEP) },
          { icon: ZoomOut,  label: "Reduzir",   action: () => applyZoom(-ZOOM_STEP) },
          { icon: Maximize2,label: "Resetar",   action: () => { setZoom(0.55); setPan({ x: 0, y: 0 }); } },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            aria-label={label}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md md:rounded-sm bg-white/90 border border-[#c8bfb0] text-[#6b5e52] hover:bg-[#f8f5ef] shadow-sm active:scale-95 transition-transform"
          >
            <Icon size={16} className="md:w-3.5 md:h-3.5" />
          </button>
        ))}
        <div className="text-center text-[10px] md:text-[9px] text-[#b0a89e] font-medium mt-0.5">{Math.round(zoom * 100)}%</div>
        <div className="mt-2 border-t border-[#c8bfb0] pt-1.5">
          <button
            onClick={() => setEditMode(!editMode)}
            aria-label="Editar posi\u00e7\u00f5es"
            className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md md:rounded-sm border shadow-sm active:scale-95 transition-transform ${
              editMode
                ? "bg-amber-100 border-amber-400 text-amber-700"
                : "bg-white/90 border-[#c8bfb0] text-[#6b5e52] hover:bg-[#f8f5ef]"
            }`}
          >
            <Move size={16} className="md:w-3.5 md:h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Hint ── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
        <span className="text-[10px] text-[#b0a89e] bg-white/70 px-2 py-1 rounded-full">
          Scroll para zoom · Arraste para mover · Clique numa mesa
        </span>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2 md:gap-3 pointer-events-none">
        {[
          { color: "rgba(245,241,232,0.9)", stroke: "rgba(184,176,164,0.8)", label: "Vazia" },
          { color: "rgba(219,234,254,0.9)", stroke: "#93c5fd",               label: "Parcial" },
          { color: "rgba(187,247,208,0.9)", stroke: "#4ade80",               label: "Cheia" },
          { color: "rgba(22,101,52,0.9)",   stroke: "#166534",               label: "Convites OK" },
        ].map(({ color, stroke, label }) => (
          <div key={label} className="flex items-center gap-1">
            <svg width="12" height="12">
              <circle cx="6" cy="6" r="5" fill={color} stroke={stroke} strokeWidth="1.5" />
            </svg>
            <span className="text-[9px] text-[#8a7f72]">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main canvas: image + SVG overlay ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: "center center",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      >
        {/* Background: the actual PDF floor plan */}
        <img
          src={FLOOR_PLAN_IMAGE_URL}
          alt="DON CONCEPT floor plan"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display: "block", userSelect: "none", pointerEvents: "none" }}
          draggable={false}
        />

        {/* SVG overlay: transparent interactive circles over each table */}
        <svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
        >
          {TABLE_POSITIONS.map((pos) => {
            const table = tableByNumber.get(pos.number);
            if (!table) return null;

            const count     = guestCounts.get(table.id) ?? 0;
            const status    = getTableStatus(count, table.capacity);
            const effectivePos = getEffectivePosition(table);
            const r         = getEffectiveRadius(table);
            const isLarge   = table.capacity >= 20;
            const isEditing = editMode && editingTableId === table.id;

            const isSelected    = selectedTableId === table.id;
            const isDragOver    = dragOverTableId  === table.id;
            const isHighlighted = highlightedTableIds.has(table.id);
            const isSearchMatch = searchHighlightedTableIds.size > 0 && searchHighlightedTableIds.has(table.id);
            const isSearchDim   = searchHighlightedTableIds.size > 0 && !searchHighlightedTableIds.has(table.id);

            const available       = table.capacity - count;
            const groupWouldFit   = draggedCompany ? draggedCompany.guestCount <= available : false;
            const isGroupDragOver = isDragOver && !!draggedCompany;

            const fill = isGroupDragOver
              ? (groupWouldFit ? "rgba(187,247,208,0.85)" : "rgba(254,202,202,0.85)")
              : isSearchMatch ? "rgba(254,243,199,0.88)"
              : isHighlighted ? "rgba(254,243,199,0.88)"
              : isDragOver    ? "rgba(219,234,254,0.88)"
              : isSelected    ? "rgba(28,25,23,0.88)"
              : isSearchDim   ? "rgba(245,241,232,0.1)"
              : (allInvitesDelivered?.get(table.id) ? STATUS_FILL_ALL_DELIVERED : STATUS_FILL[status]);

            const stroke = isGroupDragOver
              ? (groupWouldFit ? "#4ade80" : "#f87171")
              : isSearchMatch ? "#f59e0b"
              : isHighlighted ? "#f59e0b"
              : isDragOver    ? "#3b82f6"
              : isSelected    ? "#1c1917"
              : isSearchDim   ? "rgba(184,176,164,0.2)"
              : (allInvitesDelivered?.get(table.id) ? STATUS_STROKE_ALL_DELIVERED : STATUS_STROKE[status]);

            // Override text colors for dark green tables
            const isAllDelivered = allInvitesDelivered?.get(table.id) ?? false;

            const strokeW   = isSelected || isDragOver || isHighlighted || isSearchMatch ? 2.5 : 1.5;
            const nodeOpacity = isSearchDim ? 0.25 : 1;
            const textColor = isSelected ? "#f8f5ef" : isAllDelivered ? "#f0fdf4" : "#1c1917";
            const subColor  = isSelected ? "#d6d3d1" : isAllDelivered ? "#bbf7d0" : "#6b5e52";
            const compColor = isSelected ? "#e7e5e4" : isAllDelivered ? "#f0fdf4" : "#1c1917";

            const companies = parseCompanyNames(table.companyNames, table.companyName);
            const maxChars  = isLarge ? 12 : 8;
            const { line1, line2 } = formatCompanyDisplay(companies, maxChars);
            const hasCompany = companies.length > 0;

            // Tooltip content
            const tooltipText = tooltip?.tableId === table.id
              ? `Mesa ${pos.number}${hasCompany ? ` — ${companies.join(", ")}` : ""} · ${count}/${table.capacity}`
              : null;

            return (
              <g
                key={pos.number}
                className="table-node"
                style={{ cursor: editMode ? "move" : "pointer", transition: "none", transform: "none", opacity: nodeOpacity }}
                onClick={(e) => { if (!editMode) { e.stopPropagation(); onTableClick(table.id); } }}
                onMouseDown={(e) => editMode && handleEditTableMouseDown(e, table.id, effectivePos.x, effectivePos.y)}
                onDragOver={(e) => !editMode && handleDragOver(e, table.id)}
                onDrop={(e) => !editMode && handleDrop(e, table.id)}
                onDragLeave={() => !editMode && handleDragLeave()}
                onMouseEnter={() => !editMode && setTooltip({ tableId: table.id })}
                onMouseLeave={() => !editMode && setTooltip(null)}
                role="button"
                aria-label={`Mesa ${pos.number}${hasCompany ? ` — ${companies.join(", ")}` : ""}, ${count}/${table.capacity} lugares`}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onTableClick(table.id)}
              >
                {/* Main circle overlay */}
                <circle
                  cx={effectivePos.x}
                  cy={effectivePos.y}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                  style={{ transition: "none" }}
                />

                {/* Company name line 1 — centered vertically since number is in PDF bg */}
                {hasCompany && (
                  <text
                    x={effectivePos.x}
                    y={effectivePos.y - (line2 ? 3 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isLarge ? 9 : 7}
                    fontWeight="600"
                    fill={compColor}
                    fontFamily="DM Sans, sans-serif"
                    style={{ userSelect: "none" }}
                  >
                    {line1}
                  </text>
                )}

                {/* Company name line 2 */}
                {line2 && (
                  <text
                    x={effectivePos.x}
                    y={effectivePos.y + (isLarge ? 10 : 8)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isLarge ? 7.5 : 6}
                    fill={subColor}
                    fontFamily="DM Sans, sans-serif"
                    style={{ userSelect: "none" }}
                  >
                    {line2}
                  </text>
                )}

                {/* Guest count */}
                <text
                  x={effectivePos.x}
                  y={effectivePos.y + r - 5}
                  textAnchor="middle"
                  fontSize={isLarge ? 7.5 : 6}
                  fill={subColor}
                  fontFamily="DM Sans, sans-serif"
                  style={{ userSelect: "none" }}
                >
                  {count}/{table.capacity}
                </text>

                {/* Invite delivery badge — small balloon at bottom-right */}
                {count > 0 && inviteStats?.has(table.id) && (() => {
                  const stats = inviteStats.get(table.id)!;
                  const badgeX = effectivePos.x + r * 0.65;
                  const badgeY = effectivePos.y + r * 0.65;
                  const badgeFill = stats.delivered === stats.total ? "#166534" : "#78716c";
                  const badgeTextColor = "#fff";
                  return (
                    <g style={{ pointerEvents: "none" }}>
                      <rect
                        x={badgeX - 10}
                        y={badgeY - 5}
                        width={20}
                        height={10}
                        rx={5}
                        fill={badgeFill}
                        opacity={0.9}
                      />
                      <text
                        x={badgeX}
                        y={badgeY + 0.5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={5.5}
                        fontWeight="600"
                        fill={badgeTextColor}
                        fontFamily="DM Sans, sans-serif"
                        style={{ userSelect: "none" }}
                      >
                        {stats.delivered}/{stats.total}
                      </text>
                    </g>
                  );
                })()}

                {/* Edit mode indicator */}
                {editMode && (
                  <>
                    <circle
                      cx={effectivePos.x}
                      cy={effectivePos.y}
                      r={r + 4}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    {/* Resize buttons */}
                    <g
                      onClick={(e) => { e.stopPropagation(); handleRadiusChange(table.id, 4); }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={effectivePos.x + r + 10} cy={effectivePos.y - 8} r={8} fill="#fff" stroke="#f59e0b" strokeWidth={1} />
                      <text x={effectivePos.x + r + 10} y={effectivePos.y - 4} textAnchor="middle" fontSize={12} fill="#f59e0b" fontWeight="700">+</text>
                    </g>
                    <g
                      onClick={(e) => { e.stopPropagation(); handleRadiusChange(table.id, -4); }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={effectivePos.x + r + 10} cy={effectivePos.y + 8} r={8} fill="#fff" stroke="#f59e0b" strokeWidth={1} />
                      <text x={effectivePos.x + r + 10} y={effectivePos.y + 12} textAnchor="middle" fontSize={12} fill="#f59e0b" fontWeight="700">−</text>
                    </g>
                    {/* Reset button */}
                    <g
                      onClick={(e) => { e.stopPropagation(); handleResetPosition(table.id); }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={effectivePos.x - r - 10} cy={effectivePos.y} r={8} fill="#fff" stroke="#6b5e52" strokeWidth={1} />
                      <text x={effectivePos.x - r - 10} y={effectivePos.y + 4} textAnchor="middle" fontSize={8} fill="#6b5e52">↺</text>
                    </g>
                  </>
                )}

                {/* Tooltip */}
                {!editMode && tooltipText && (
                  <g>
                    <rect
                      x={effectivePos.x - 70}
                      y={effectivePos.y - r - 28}
                      width={140}
                      height={20}
                      rx={4}
                      fill="rgba(28,25,23,0.9)"
                    />
                    <text
                      x={effectivePos.x}
                      y={effectivePos.y - r - 14}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#f8f5ef"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {tooltipText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* SuggestNeighborDialog */}
      <SuggestNeighborDialog
        tables={tables}
        guestCounts={guestCounts}
      />
    </div>
  );
}
