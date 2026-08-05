/**
 * FloorMap — DON CONCEPT
 *
 * SVG floor plan faithful to StudioCaso_DON_CONCEPT_HANIERR01NUMERADO.pdf
 *
 * Key structural elements (from PDF):
 *  - Main hall: wide rectangle with left annex and right curved wall
 *  - PALCO 8×5 (dark grey): upper centre
 *  - House Mix booth: right of PALCO
 *  - Two LOUNGE sofas (organic shapes): between PALCO and tables 10/44
 *  - Two FRIOS (refrigerator columns): centre, between rows 4-5
 *  - LOUNGE INSTAGRAMÁVEL: lower centre (large grey area with plants)
 *  - 4 BUFFET counters: top (2 left, 2 right)
 *  - 1 BUFFET: left wall (vertical)
 *  - Cortinado Preto labels: top-left, top-right, right-wall
 *
 * Tables: flower style — circle + surrounding chair dots (no hover animation)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TABLE_POSITIONS,
  TABLE_RADIUS_NORMAL,
  TABLE_RADIUS_LARGE,
  CHAIR_RADIUS_NORMAL,
  CHAIR_RADIUS_LARGE,
  CHAIR_ORBIT_NORMAL,
  CHAIR_ORBIT_LARGE,
  CHAIR_COUNT_NORMAL,
  CHAIR_COUNT_LARGE,
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

// ─── Colour palette ───────────────────────────────────────────────────────────
const STATUS_FILL:   Record<string, string> = { empty: "#f5f1e8", partial: "#dbeafe", full: "#bbf7d0" };
const STATUS_STROKE: Record<string, string> = { empty: "#b8b0a4", partial: "#93c5fd", full: "#4ade80" };

// ─── Zoom constants ───────────────────────────────────────────────────────────
const MIN_ZOOM  = 0.35;
const MAX_ZOOM  = 4.0;
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
  } = useSeating();

  const utils = trpc.useUtils();
  const [tooltip, setTooltip] = useState<{ tableId: number } | null>(null);

  // ── Zoom / Pan ──────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const isPanning       = useRef(false);
  const panStart        = useRef({ x: 0, y: 0 });
  const panOrigin       = useRef({ x: 0, y: 0 });
  const containerRef    = useRef<HTMLDivElement>(null);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    if (!containerRef.current) return { x, y };
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const maxX = Math.max(0, (CANVAS_WIDTH  * z - cw) / 2);
    const maxY = Math.max(0, (CANVAS_HEIGHT * z - ch) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const applyZoom = (nz: number) => { setPan((p) => clampPan(p.x, p.y, nz)); return nz; };
  const handleZoomIn    = () => setZoom((z) => applyZoom(Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2)))));
  const handleZoomOut   = () => setZoom((z) => applyZoom(Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2)))));
  const handleResetZoom = () => { setZoom(1.0); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => { const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((z + delta).toFixed(2)))); setPan((p) => clampPan(p.x, p.y, nz)); return nz; });
  }, [clampPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as SVGElement).closest(".table-node")) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan(clampPan(panOrigin.current.x + e.clientX - panStart.current.x, panOrigin.current.y + e.clientY - panStart.current.y, zoom));
  };
  const handleMouseUp = () => { isPanning.current = false; };

  // Touch
  const touchStart     = useRef<{ x: number; y: number } | null>(null);
  const touchPanOrigin = useRef({ x: 0, y: 0 });
  const pinchDist0     = useRef<number | null>(null);
  const pinchZoom0     = useRef(1);
  const dist2 = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; touchPanOrigin.current = { ...pan }; pinchDist0.current = null; }
    else if (e.touches.length === 2) { pinchDist0.current = dist2(e.touches); pinchZoom0.current = zoom; touchStart.current = null; }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist0.current !== null) {
      e.preventDefault();
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((pinchZoom0.current * dist2(e.touches) / pinchDist0.current).toFixed(2))));
      setZoom(nz); setPan((p) => clampPan(p.x, p.y, nz)); return;
    }
    if (!touchStart.current || e.touches.length !== 1) return;
    setPan(clampPan(touchPanOrigin.current.x + e.touches[0].clientX - touchStart.current.x, touchPanOrigin.current.y + e.touches[0].clientY - touchStart.current.y, zoom));
  };
  const handleTouchEnd = () => { touchStart.current = null; pinchDist0.current = null; };

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const assignMutation = trpc.guests.assign.useMutation({
    onSuccess: () => { utils.guests.unassigned.invalidate(); utils.guests.list.invalidate(); utils.tables.getGuests.invalidate(); },
    onError:   (err) => toast.error("Erro ao mover convidado: " + err.message),
  });
  const bulkAssignMutation = trpc.guests.bulkAssign.useMutation({
    onSuccess: (data) => {
      utils.guests.unassigned.invalidate(); utils.guests.list.invalidate();
      utils.tables.list.invalidate(); utils.tables.getGuests.invalidate();
      toast.success(`${data.count} convidado${data.count !== 1 ? "s" : ""} alocado${data.count !== 1 ? "s" : ""} com sucesso!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const tableByNumber = new Map(tables.map((t) => [t.tableNumber, t]));

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragOver  = (e: React.DragEvent, tableId: number) => { if (!draggedGuest && !draggedCompany) return; e.preventDefault(); setDragOverTableId(tableId); };
  const handleDragLeave = () => setDragOverTableId(null);

  const handleDrop = (e: React.DragEvent, tableId: number) => {
    e.preventDefault();
    setDragOverTableId(null);

    if (draggedCompany) {
      const table     = tables.find((t) => t.id === tableId);
      if (!table) { setDraggedCompany(null); return; }
      const available = table.capacity - (guestCounts.get(tableId) ?? 0);

      if (draggedCompany.guestCount <= available) {
        bulkAssignMutation.mutate({ guestIds: draggedCompany.guestIds, tableId, companyName: draggedCompany.companyName });
        setDraggedCompany(null); setHighlightedTableIds(new Set()); return;
      }

      const suggestion = findTableSetForGroup(table.tableNumber, draggedCompany.guestCount, tables, guestCounts);
      if (suggestion) setHighlightedTableIds(new Set(suggestion.map((s) => s.tableId)));
      setPendingCompanyDrop({ companyName: draggedCompany.companyName, guestIds: draggedCompany.guestIds, targetTableNumber: table.tableNumber });
      setDraggedCompany(null); return;
    }

    if (!draggedGuest) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    if ((guestCounts.get(tableId) ?? 0) >= table.capacity) { toast.error(`Mesa ${table.tableNumber} está cheia (${table.capacity} lugares)`); setDraggedGuest(null); return; }
    assignMutation.mutate({ guestId: draggedGuest.guest.id, tableId });
    setDraggedGuest(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full flex flex-col" style={{ minHeight: 0 }}>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button onClick={handleZoomIn}    disabled={zoom >= MAX_ZOOM} className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] disabled:opacity-40 shadow-sm" aria-label="Ampliar"><ZoomIn size={14} /></button>
        <button onClick={handleZoomOut}   disabled={zoom <= MIN_ZOOM} className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] disabled:opacity-40 shadow-sm" aria-label="Reduzir"><ZoomOut size={14} /></button>
        <button onClick={handleResetZoom}                              className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] shadow-sm" aria-label="Resetar"><Maximize2 size={13} /></button>
        <div className="text-center text-[10px] text-[#b0a89e] font-medium mt-0.5">{Math.round(zoom * 100)}%</div>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning.current ? "grabbing" : "grab", minHeight: 0 }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center", transition: isPanning.current ? "none" : "transform 0.08s ease-out", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            style={{ width: "100%", height: "100%", userSelect: "none" }}
            aria-label="Mapa de mesas DON CONCEPT"
          >
            {/* ── Outer background ── */}
            <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#e8e4dc" />

            {/* ── Main hall floor (cream/wood texture simulation) ── */}
            <rect x={108} y={60} width={1140} height={800} fill="#f5f0e6" stroke="#8a8278" strokeWidth={2.5} />

            {/* ── Left annex (tables 23, 24, 34) ── */}
            <rect x={60} y={460} width={50} height={400} fill="#f0ece2" stroke="#8a8278" strokeWidth={1.5} />

            {/* ── Right curved wall (tables 38, 49, 59, 70) ── */}
            <path d="M 1248 60 C 1300 160 1320 310 1320 460 C 1320 610 1300 760 1248 860 L 1248 60 Z" fill="#f0ece2" stroke="#8a8278" strokeWidth={1.5} />

            {/* ── Horizontal wood-plank lines (subtle texture) ── */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1={110} y1={120 + i * 62} x2={1246} y2={120 + i * 62} stroke="#ece8de" strokeWidth={0.5} />
            ))}

            {/* ══════════════════════════════════════════════════════════════
                STRUCTURAL ELEMENTS — measured from PDF
            ══════════════════════════════════════════════════════════════ */}

            {/* ── BUFFET counters top-left pair ── */}
            <rect x={172} y={68} width={82} height={24} fill="#d8cfc0" stroke="#b8b0a4" strokeWidth={1} rx={2} />
            <text x={213} y={83} textAnchor="middle" fontSize={7.5} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.12em" fontWeight="600">BUFFET</text>

            <rect x={268} y={68} width={82} height={24} fill="#d8cfc0" stroke="#b8b0a4" strokeWidth={1} rx={2} />
            <text x={309} y={83} textAnchor="middle" fontSize={7.5} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.12em" fontWeight="600">BUFFET</text>

            {/* ── BUFFET counters top-right pair ── */}
            <rect x={910} y={68} width={82} height={24} fill="#d8cfc0" stroke="#b8b0a4" strokeWidth={1} rx={2} />
            <text x={951} y={83} textAnchor="middle" fontSize={7.5} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.12em" fontWeight="600">BUFFET</text>

            <rect x={1006} y={68} width={82} height={24} fill="#d8cfc0" stroke="#b8b0a4" strokeWidth={1} rx={2} />
            <text x={1047} y={83} textAnchor="middle" fontSize={7.5} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.12em" fontWeight="600">BUFFET</text>

            {/* ── Left-wall BUFFET (vertical) ── */}
            <rect x={112} y={300} width={26} height={110} fill="#d8cfc0" stroke="#b8b0a4" strokeWidth={1} rx={2} />
            <text x={125} y={358} textAnchor="middle" fontSize={6.5} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.1em" transform="rotate(-90,125,358)">BUFFET</text>

            {/* ── Cortinado Preto labels ── */}
            <text x={240} y={72} textAnchor="middle" fontSize={5.5} fill="#9a9288" fontFamily="DM Sans,sans-serif" letterSpacing="0.08em">Cortinado Preto</text>
            <text x={990} y={72} textAnchor="middle" fontSize={5.5} fill="#9a9288" fontFamily="DM Sans,sans-serif" letterSpacing="0.08em">Cortinado Preto</text>

            {/* ── PALCO 8×5 (dark grey block) — upper centre ── */}
            {/* Central gap: x 530–790 → PALCO occupies x 556–766, y 78–220 */}
            <rect x={556} y={78} width={210} height={148} fill="#8a8480" stroke="#6a6460" strokeWidth={1.5} rx={3} />
            <text x={661} y={148} textAnchor="middle" fontSize={13} fill="#f0ece6" fontFamily="DM Sans,sans-serif" letterSpacing="0.18em" fontWeight="700">PALCO</text>
            <text x={661} y={163} textAnchor="middle" fontSize={7} fill="#c8c4c0" fontFamily="DM Sans,sans-serif" letterSpacing="0.1em">8 × 5</text>

            {/* ── House Mix booth — right of PALCO ── */}
            <rect x={766} y={78} width={82} height={74} fill="#c0bab4" stroke="#a0a098" strokeWidth={1} rx={2} />
            <text x={807} y={118} textAnchor="middle" fontSize={6.5} fill="#4a4840" fontFamily="DM Sans,sans-serif" letterSpacing="0.08em">House Mix</text>

            {/* ── Lounge sofas (organic/bean shapes) between PALCO and tables 10/44 ── */}
            {/* Left sofa centred at x=610, y=290 */}
            <ellipse cx={610} cy={292} rx={22} ry={36} fill="#c8b89a" stroke="#a89878" strokeWidth={1} transform="rotate(-10,610,292)" />
            <ellipse cx={610} cy={292} rx={14} ry={24} fill="#b8a888" stroke="none" transform="rotate(-10,610,292)" />
            <text x={610} y={336} textAnchor="middle" fontSize={5.5} fill="#8a7860" fontFamily="DM Sans,sans-serif">Lounge</text>

            {/* Right sofa centred at x=712, y=290 */}
            <ellipse cx={712} cy={292} rx={22} ry={36} fill="#c8b89a" stroke="#a89878" strokeWidth={1} transform="rotate(10,712,292)" />
            <ellipse cx={712} cy={292} rx={14} ry={24} fill="#b8a888" stroke="none" transform="rotate(10,712,292)" />
            <text x={712} y={336} textAnchor="middle" fontSize={5.5} fill="#8a7860" fontFamily="DM Sans,sans-serif">Lounge</text>

            {/* ── FRIOS (refrigerator columns) — centre between rows 4-5 ── */}
            <rect x={598} y={400} width={40} height={92} fill="#d8d0c4" stroke="#b0a898" strokeWidth={1} rx={2} />
            <text x={618} y={450} textAnchor="middle" fontSize={6} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.1em" transform="rotate(-90,618,450)">FRIOS</text>

            <rect x={684} y={400} width={40} height={92} fill="#d8d0c4" stroke="#b0a898" strokeWidth={1} rx={2} />
            <text x={704} y={450} textAnchor="middle" fontSize={6} fill="#6a6258" fontFamily="DM Sans,sans-serif" letterSpacing="0.1em" transform="rotate(-90,704,450)">FRIOS</text>

            {/* ── Curved bar elements (grey wavy shapes) beside FRIOS ── */}
            <path d="M 582 500 Q 592 530 587 558 Q 582 586 592 608" stroke="#b0a898" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.6} />
            <path d="M 742 500 Q 732 530 737 558 Q 742 586 732 608" stroke="#b0a898" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.6} />

            {/* ── LOUNGE INSTAGRAMÁVEL — lower centre ── */}
            {/* Spans x 370–1010, y 690–858 */}
            <rect x={370} y={690} width={640} height={168} fill="#ddd8d0" stroke="#b0a898" strokeWidth={1.5} rx={4} />
            <text x={690} y={772} textAnchor="middle" fontSize={11} fill="#4a4840" fontFamily="DM Sans,sans-serif" letterSpacing="0.14em" fontWeight="700">LOUNGE</text>
            <text x={690} y={787} textAnchor="middle" fontSize={7.5} fill="#8a8278" fontFamily="DM Sans,sans-serif" letterSpacing="0.08em">Instagramável</text>

            {/* Plants in lounge */}
            {[{ cx: 420, cy: 748 }, { cx: 440, cy: 766 }, { cx: 432, cy: 754 },
              { cx: 940, cy: 748 }, { cx: 958, cy: 766 }, { cx: 950, cy: 754 }].map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r={i % 3 === 2 ? 14 : 9} fill="#a8c898" stroke="#88a878" strokeWidth={0.8} opacity={0.7} />
            ))}

            {/* ══════════════════════════════════════════════════════════════
                TABLES — flower style
            ══════════════════════════════════════════════════════════════ */}
            {TABLE_POSITIONS.map((pos) => {
              const table = tableByNumber.get(pos.number);
              if (!table) return null;

              const count   = guestCounts.get(table.id) ?? 0;
              const status  = getTableStatus(count, table.capacity);
              const isLarge = !!pos.large;
              const tR      = isLarge ? TABLE_RADIUS_LARGE  : TABLE_RADIUS_NORMAL;
              const cR      = isLarge ? CHAIR_RADIUS_LARGE  : CHAIR_RADIUS_NORMAL;
              const cOrbit  = isLarge ? CHAIR_ORBIT_LARGE   : CHAIR_ORBIT_NORMAL;
              const cCount  = isLarge ? CHAIR_COUNT_LARGE   : CHAIR_COUNT_NORMAL;

              const isSelected    = selectedTableId === table.id;
              const isDragOver    = dragOverTableId  === table.id;
              const isHighlighted = highlightedTableIds.has(table.id);

              const companies = parseCompanyNames(table.companyNames, table.companyName);
              const maxChars  = isLarge ? 13 : 9;
              const { line1, line2 } = formatCompanyDisplay(companies, maxChars);
              const hasCompany = line1.length > 0;

              const available       = table.capacity - count;
              const groupWouldFit   = draggedCompany ? draggedCompany.guestCount <= available : false;
              const isGroupDragOver = isDragOver && !!draggedCompany;

              const fill = isGroupDragOver
                ? (groupWouldFit ? "#bbf7d0" : "#fecaca")
                : isHighlighted ? "#fef3c7"
                : isDragOver    ? "#bfdbfe"
                : isSelected    ? "#1c1917"
                : STATUS_FILL[status];

              const stroke = isGroupDragOver
                ? (groupWouldFit ? "#4ade80" : "#f87171")
                : isHighlighted ? "#f59e0b"
                : isDragOver    ? "#3b82f6"
                : isSelected    ? "#1c1917"
                : STATUS_STROKE[status];

              const strokeW   = isSelected || isDragOver || isHighlighted ? 2 : 1.5;
              const textColor = isSelected ? "#f8f5ef" : "#1c1917";
              const subColor  = isSelected ? "#d6d3d1" : "#8a7f72";
              const compColor = isSelected ? "#e7e5e4" : "#3d3530";

              // Vertical text layout
              const lineH      = isLarge ? 9 : 8;
              const totalLines = 1 + (hasCompany ? 1 : 0) + (line2 ? 1 : 0) + 1;
              const totalH     = (totalLines - 1) * lineH;
              let   curY       = pos.y - totalH / 2;
              const numY = curY; curY += lineH;
              const c1Y  = hasCompany ? curY : null; if (hasCompany) curY += lineH;
              const c2Y  = line2      ? curY : null; if (line2)      curY += lineH;
              const cntY = curY;

              return (
                <g
                  key={pos.number}
                  className="table-node"
                  style={{ cursor: "pointer", transition: "none", transform: "none" }}
                  onClick={() => onTableClick(table.id)}
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
                  {/* Chair dots */}
                  {Array.from({ length: cCount }).map((_, i) => {
                    const angle  = (i / cCount) * 2 * Math.PI - Math.PI / 2;
                    const cx     = pos.x + cOrbit * Math.cos(angle);
                    const cy     = pos.y + cOrbit * Math.sin(angle);
                    const seated = i < count;
                    return (
                      <circle key={i} cx={cx} cy={cy} r={cR}
                        fill={seated ? (isSelected ? "#a8a29e" : "#6b5e52") : "#d4cec4"}
                        stroke={seated ? (isSelected ? "#8a8078" : "#4a4038") : "#c0b8b0"}
                        strokeWidth={0.5}
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  })}

                  {/* Table circle */}
                  <circle cx={pos.x} cy={pos.y} r={tR} fill={fill} stroke={stroke} strokeWidth={strokeW} />

                  {/* Inner ring for large tables */}
                  {isLarge && (
                    <circle cx={pos.x} cy={pos.y} r={tR - 7} fill="none"
                      stroke={isSelected ? "#a8a29e" : "#c8bfb0"} strokeWidth={0.8} strokeDasharray="3 2"
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Highlight ring */}
                  {isHighlighted && (
                    <circle cx={pos.x} cy={pos.y} r={cOrbit + cR + 4} fill="none"
                      stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" opacity={0.75}
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Table number */}
                  <text x={pos.x} y={numY + 4} textAnchor="middle" dominantBaseline="middle"
                    fontSize={isLarge ? 12 : 10} fontWeight="700" fill={textColor}
                    fontFamily="Playfair Display, serif" style={{ pointerEvents: "none" }}>
                    {String(pos.number).padStart(2, "0")}
                  </text>

                  {/* Company line 1 */}
                  {c1Y !== null && (
                    <text x={pos.x} y={c1Y + 4} textAnchor="middle" dominantBaseline="middle"
                      fontSize={isLarge ? 7.5 : 6} fontWeight="600" fill={compColor}
                      fontFamily="DM Sans, sans-serif" letterSpacing="0.02em" style={{ pointerEvents: "none" }}>
                      {line1}
                    </text>
                  )}

                  {/* Company line 2 */}
                  {c2Y !== null && line2 && (
                    <text x={pos.x} y={c2Y + 4} textAnchor="middle" dominantBaseline="middle"
                      fontSize={isLarge ? 7 : 5.5} fontWeight="500"
                      fill={isSelected ? "#c8c5c1" : "#7a7060"}
                      fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>
                      {line2}
                    </text>
                  )}

                  {/* Seat count */}
                  <text x={pos.x} y={cntY + 4} textAnchor="middle" dominantBaseline="middle"
                    fontSize={5.5} fill={subColor} fontFamily="DM Sans, sans-serif"
                    style={{ pointerEvents: "none" }}>
                    {count}/{table.capacity}
                  </text>

                  {/* Capacity badge on company group drag */}
                  {isGroupDragOver && (
                    <g style={{ pointerEvents: "none" }}>
                      <rect x={pos.x - 22} y={pos.y - cOrbit - cR - 18} width={44} height={14} rx={7}
                        fill={groupWouldFit ? "#16a34a" : "#dc2626"} opacity={0.95} />
                      <text x={pos.x} y={pos.y - cOrbit - cR - 11} textAnchor="middle" dominantBaseline="middle"
                        fontSize={6.5} fontWeight="700" fill="white" fontFamily="DM Sans, sans-serif">
                        {groupWouldFit ? `+${draggedCompany!.guestCount} ✔` : `${draggedCompany!.guestCount}>${available} ✘`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ── Hover tooltip ── */}
            {tooltip && (() => {
              const t   = tables.find((tb) => tb.id === tooltip.tableId);
              const pos = TABLE_POSITIONS.find((p) => t && p.number === t.tableNumber);
              if (!t || !pos) return null;
              const cnt    = guestCounts.get(t.id) ?? 0;
              const isLg   = !!pos.large;
              const orbit  = isLg ? CHAIR_ORBIT_LARGE : CHAIR_ORBIT_NORMAL;
              const cr     = isLg ? CHAIR_RADIUS_LARGE : CHAIR_RADIUS_NORMAL;
              const names  = parseCompanyNames(t.companyNames, t.companyName);
              const label  = names.length > 0 ? names.join(" / ") : "Sem empresa";
              const disp   = label.length > 44 ? label.slice(0, 43) + "…" : label;
              const tw     = Math.max(disp.length * 5.6 + 24, 110);
              const tx     = Math.min(Math.max(pos.x - tw / 2, 112), CANVAS_WIDTH - tw - 112);
              const ty     = pos.y - orbit - cr - 44;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx} y={ty} width={tw} height={34} rx={4} fill="#1c1917" opacity={0.93} />
                  <text x={tx + tw / 2} y={ty + 13} textAnchor="middle" fontSize={8} fill="#f8f5ef" fontFamily="DM Sans,sans-serif" fontWeight="600">{disp}</text>
                  <text x={tx + tw / 2} y={ty + 25} textAnchor="middle" fontSize={7} fill="#a8a29e" fontFamily="DM Sans,sans-serif">Mesa {pos.number} · {cnt}/{t.capacity} lugares</text>
                </g>
              );
            })()}

            {/* ── Legend ── */}
            <g transform={`translate(${CANVAS_WIDTH - 220}, ${CANVAS_HEIGHT - 26})`}>
              {[
                { f: STATUS_FILL.empty,   s: STATUS_STROKE.empty,   l: "Vazia"   },
                { f: STATUS_FILL.partial, s: STATUS_STROKE.partial, l: "Parcial" },
                { f: STATUS_FILL.full,    s: STATUS_STROKE.full,    l: "Cheia"   },
              ].map((item, i) => (
                <g key={i} transform={`translate(${i * 70}, 0)`}>
                  <circle cx={8} cy={0} r={7} fill={item.f} stroke={item.s} strokeWidth={1.2} />
                  <text x={19} y={4} fontSize={8.5} fill="#8a7f72" fontFamily="DM Sans,sans-serif">{item.l}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* Hint bar */}
      <div className="shrink-0 px-3 py-1.5 text-center border-t border-[#e8e2d8]">
        <p className="text-[10px] text-[#b0a89e]">Scroll para zoom · Arraste para mover · Clique numa mesa para detalhes</p>
      </div>

      {/* Suggest Neighbor Dialog */}
      <SuggestNeighborDialog
        open={!!pendingCompanyDrop}
        onClose={() => { setPendingCompanyDrop(null); setHighlightedTableIds(new Set()); }}
        pending={pendingCompanyDrop}
        allTables={tables}
        guestCounts={guestCounts}
      />
    </div>
  );
}
