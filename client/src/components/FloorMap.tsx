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
  findTableSetForGroup,
} from "@/lib/floorLayout";
import { useSeating } from "@/contexts/SeatingContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  }>;
  guestCounts: Map<number, number>;
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
const STATUS_STROKE: Record<string, string> = {
  empty:   "rgba(184,176,164,0.5)",
  partial: "#93c5fd",
  full:    "#4ade80",
};

// ─── Zoom constants ───────────────────────────────────────────────────────────
const MIN_ZOOM  = 0.3;
const MAX_ZOOM  = 5.0;
const ZOOM_STEP = 0.15;

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloorMap({ eventId: _eventId, tables, guestCounts, onTableClick }: FloorMapProps) {
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

  // ── Zoom / Pan ──────────────────────────────────────────────────────────────
  // Start zoomed out so the full 1600×1453 map fits in the viewport
  const [zoom, setZoom] = useState(0.55);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const isPanning       = useRef(false);
  const panStart        = useRef({ x: 0, y: 0 });
  const panOrigin       = useRef({ x: 0, y: 0 });
  const containerRef    = useRef<HTMLDivElement>(null);

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
      className="w-full h-full overflow-hidden relative select-none"
      style={{ cursor: isPanning.current ? "grabbing" : "grab", background: "#e8e4dc" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Zoom controls ── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        {[
          { icon: ZoomIn,   label: "Ampliar",   action: () => applyZoom(+ZOOM_STEP) },
          { icon: ZoomOut,  label: "Reduzir",   action: () => applyZoom(-ZOOM_STEP) },
          { icon: Maximize2,label: "Resetar",   action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            aria-label={label}
            className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/90 border border-[#c8bfb0] text-[#6b5e52] hover:bg-[#f8f5ef] shadow-sm"
          >
            <Icon size={14} />
          </button>
        ))}
        <div className="text-center text-[9px] text-[#b0a89e] font-medium mt-0.5">{Math.round(zoom * 100)}%</div>
      </div>

      {/* ── Hint ── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-[10px] text-[#b0a89e] bg-white/70 px-2 py-0.5 rounded-full">
          Scroll para zoom · Arraste para mover · Clique numa mesa para detalhes
        </span>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-2 right-3 z-10 flex items-center gap-3 pointer-events-none">
        {[
          { color: "rgba(245,241,232,0.9)", stroke: "rgba(184,176,164,0.8)", label: "Vazia" },
          { color: "rgba(219,234,254,0.9)", stroke: "#93c5fd",               label: "Parcial" },
          { color: "rgba(187,247,208,0.9)", stroke: "#4ade80",               label: "Cheia" },
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
            const isLarge   = table.capacity >= 20;
            const r         = isLarge ? TABLE_R_LARGE : TABLE_R_NORMAL;

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
              : STATUS_FILL[status];

            const stroke = isGroupDragOver
              ? (groupWouldFit ? "#4ade80" : "#f87171")
              : isSearchMatch ? "#f59e0b"
              : isHighlighted ? "#f59e0b"
              : isDragOver    ? "#3b82f6"
              : isSelected    ? "#1c1917"
              : isSearchDim   ? "rgba(184,176,164,0.2)"
              : STATUS_STROKE[status];

            const strokeW   = isSelected || isDragOver || isHighlighted || isSearchMatch ? 2.5 : 1.5;
            const nodeOpacity = isSearchDim ? 0.25 : 1;
            const textColor = isSelected ? "#f8f5ef" : "#1c1917";
            const subColor  = isSelected ? "#d6d3d1" : "#6b5e52";
            const compColor = isSelected ? "#e7e5e4" : "#1c1917";

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
                style={{ cursor: "pointer", transition: "none", transform: "none", opacity: nodeOpacity }}
                onClick={(e) => { e.stopPropagation(); onTableClick(table.id); }}
                onDragOver={(e) => handleDragOver(e, table.id)}
                onDrop={(e) => handleDrop(e, table.id)}
                onDragLeave={handleDragLeave}
                onMouseEnter={() => setTooltip({ tableId: table.id })}
                onMouseLeave={() => setTooltip(null)}
                role="button"
                aria-label={`Mesa ${pos.number}${hasCompany ? ` — ${companies.join(", ")}` : ""}, ${count}/${table.capacity} lugares`}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onTableClick(table.id)}
              >
                {/* Main circle overlay */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                  style={{ transition: "none" }}
                />

                {/* Table number */}
                <text
                  x={pos.x}
                  y={pos.y - (hasCompany ? (line2 ? 10 : 6) : 4)}
                  textAnchor="middle"
                  fontSize={isLarge ? 13 : 11}
                  fontWeight="700"
                  fill={textColor}
                  fontFamily="DM Sans, sans-serif"
                  style={{ userSelect: "none" }}
                >
                  {String(pos.number).padStart(2, "0")}
                </text>

                {/* Company name line 1 */}
                {hasCompany && (
                  <text
                    x={pos.x}
                    y={pos.y + (isLarge ? 5 : 4)}
                    textAnchor="middle"
                    fontSize={isLarge ? 8 : 6.5}
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
                    x={pos.x}
                    y={pos.y + (isLarge ? 14 : 12)}
                    textAnchor="middle"
                    fontSize={isLarge ? 7 : 5.5}
                    fill={subColor}
                    fontFamily="DM Sans, sans-serif"
                    style={{ userSelect: "none" }}
                  >
                    {line2}
                  </text>
                )}

                {/* Guest count */}
                <text
                  x={pos.x}
                  y={pos.y + r - 5}
                  textAnchor="middle"
                  fontSize={isLarge ? 7.5 : 6}
                  fill={subColor}
                  fontFamily="DM Sans, sans-serif"
                  style={{ userSelect: "none" }}
                >
                  {count}/{table.capacity}
                </text>

                {/* Tooltip */}
                {tooltipText && (
                  <g>
                    <rect
                      x={pos.x - 70}
                      y={pos.y - r - 28}
                      width={140}
                      height={20}
                      rx={4}
                      fill="rgba(28,25,23,0.9)"
                    />
                    <text
                      x={pos.x}
                      y={pos.y - r - 14}
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
