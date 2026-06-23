import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TABLE_POSITIONS,
  TABLE_RADIUS_NORMAL,
  TABLE_RADIUS_LARGE,
} from "@/lib/floorLayout";
import { useSeating } from "@/contexts/SeatingContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface FloorMapProps {
  eventId: number;
  tables: Array<{
    id: number;
    tableNumber: number;
    companyName: string | null;
    capacity: number;
  }>;
  guestCounts: Map<number, number>; // tableId → count
  onTableClick: (tableId: number) => void;
}

function getTableStatus(count: number, capacity: number): "empty" | "partial" | "full" {
  if (count === 0) return "empty";
  if (count >= capacity) return "full";
  return "partial";
}

const STATUS_FILL: Record<string, string> = {
  empty: "#f0ece4",
  partial: "#dbeafe",
  full: "#bbf7d0",
};

const STATUS_STROKE: Record<string, string> = {
  empty: "#c8bfb0",
  partial: "#93c5fd",
  full: "#4ade80",
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.2;

export default function FloorMap({ eventId, tables, guestCounts, onTableClick }: FloorMapProps) {
  const { selectedTableId, draggedGuest, setDraggedGuest, dragOverTableId, setDragOverTableId } = useSeating();
  const utils = trpc.useUtils();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; tableId: number } | null>(null);

  // ── Zoom / Pan state ──────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    if (!containerRef.current) return { x, y };
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const scaledW = CANVAS_WIDTH * z;
    const scaledH = CANVAS_HEIGHT * z;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const handleZoomIn = () => {
    setZoom((z) => {
      const nz = Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2)));
      setPan((p) => clampPan(p.x, p.y, nz));
      return nz;
    });
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2)));
      setPan((p) => clampPan(p.x, p.y, nz));
      return nz;
    });
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((z + delta).toFixed(2))));
      setPan((p) => clampPan(p.x, p.y, nz));
      return nz;
    });
  }, [clampPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pan via mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Only pan if not clicking a table (tables have their own onClick)
    const target = e.target as SVGElement;
    if (target.closest(".table-node")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    e.currentTarget.setAttribute("data-panning", "true");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan(clampPan(panOrigin.current.x + dx, panOrigin.current.y + dy, zoom));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).removeAttribute("data-panning");
  };

  // Touch pan
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchPanOrigin = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchPanOrigin.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    setPan(clampPan(touchPanOrigin.current.x + dx, touchPanOrigin.current.y + dy, zoom));
  };

  const handleTouchEnd = () => { touchStart.current = null; };

  // ── tRPC ─────────────────────────────────────────────────────────────────
  const assignMutation = trpc.guests.assign.useMutation({
    onSuccess: () => {
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      utils.tables.getGuests.invalidate();
    },
    onError: (err) => toast.error("Erro ao mover convidado: " + err.message),
  });

  const tableByNumber = new Map(tables.map((t) => [t.tableNumber, t]));

  const handleDragOver = (e: React.DragEvent, tableId: number) => {
    if (!draggedGuest) return;
    e.preventDefault();
    setDragOverTableId(tableId);
  };

  const handleDrop = (e: React.DragEvent, tableId: number) => {
    e.preventDefault();
    setDragOverTableId(null);
    if (!draggedGuest) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    const currentCount = guestCounts.get(tableId) ?? 0;
    if (currentCount >= table.capacity) {
      toast.error(`Mesa ${table.tableNumber} está cheia (${table.capacity} lugares)`);
      setDraggedGuest(null);
      return;
    }
    assignMutation.mutate({ guestId: draggedGuest.guest.id, tableId });
    setDraggedGuest(null);
  };

  const handleDragLeave = () => setDragOverTableId(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Truncate company name to fit inside the table circle
  function truncateCompany(name: string, maxChars: number): string {
    if (!name) return "";
    return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
  }

  return (
    <div className="relative w-full h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] disabled:opacity-40 transition-colors shadow-sm"
          title="Zoom in"
          aria-label="Ampliar mapa"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] disabled:opacity-40 transition-colors shadow-sm"
          title="Zoom out"
          aria-label="Reduzir mapa"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          className="w-8 h-8 bg-white border border-[#c8bfb0] rounded-sm flex items-center justify-center text-[#6b5e52] hover:bg-[#f0ece4] transition-colors shadow-sm"
          title="Resetar zoom"
          aria-label="Resetar zoom"
        >
          <Maximize2 size={13} />
        </button>
        <div className="text-center text-[10px] text-[#b0a89e] font-medium mt-0.5">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning.current ? "grabbing" : "grab", minHeight: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-panning="false"
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning.current ? "none" : "transform 0.1s ease-out",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            style={{ width: "100%", height: "100%", userSelect: "none" }}
            aria-label="Mapa de mesas DON CONCEPT"
          >
            {/* Background */}
            <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f4f0e8" rx={4} />

            {/* Hall boundary */}
            <rect x={55} y={35} width={950} height={640} fill="#faf8f3" stroke="#c8bfb0" strokeWidth={2} rx={3} />

            {/* ── Buffet counters (top) ── */}
            {[
              { x: 130, y: 55, w: 70, label: "BUFFET" },
              { x: 220, y: 55, w: 70, label: "BUFFET" },
              { x: 730, y: 55, w: 70, label: "BUFFET" },
              { x: 820, y: 55, w: 70, label: "BUFFET" },
            ].map((b, i) => (
              <g key={i}>
                <rect x={b.x - b.w / 2} y={b.y - 11} width={b.w} height={22} fill="#e8e2d8" stroke="#c0b8ae" strokeWidth={1} rx={3} />
                <text x={b.x} y={b.y + 4} textAnchor="middle" fontSize={7.5} fill="#8a7f72" fontFamily="DM Sans, sans-serif" letterSpacing="0.1em" fontWeight="500">{b.label}</text>
              </g>
            ))}

            {/* ── Left side BUFFET ── */}
            <rect x={57} y={220} width={28} height={90} fill="#e8e2d8" stroke="#c0b8ae" strokeWidth={1} rx={2} />
            <text x={71} y={270} textAnchor="middle" fontSize={6.5} fill="#8a7f72" fontFamily="DM Sans, sans-serif" letterSpacing="0.08em" transform="rotate(-90, 71, 270)">BUFFET</text>

            {/* ── PALCO (stage) — center-top ── */}
            <rect x={462} y={95} width={136} height={110} fill="#e0dbd2" stroke="#b0a89e" strokeWidth={1.5} rx={4} />
            <text x={530} y={143} textAnchor="middle" fontSize={10} fill="#5a4f44" fontFamily="DM Sans, sans-serif" letterSpacing="0.14em" fontWeight="600">PALCO</text>
            <text x={530} y={157} textAnchor="middle" fontSize={7.5} fill="#a09890" fontFamily="DM Sans, sans-serif">/ Apresentação</text>

            {/* ── PISTA (dance floor) — center-middle ── */}
            <rect x={468} y={215} width={124} height={120} fill="#ede9e0" stroke="#c0b8ae" strokeWidth={1} strokeDasharray="4 3" rx={3} />
            <text x={530} y={282} textAnchor="middle" fontSize={8} fill="#a09890" fontFamily="DM Sans, sans-serif" letterSpacing="0.1em">PISTA</text>

            {/* ── LOUNGE INTEGRADO — center-bottom ── */}
            <rect x={462} y={345} width={136} height={130} fill="#e8e4dc" stroke="#b0a89e" strokeWidth={1.5} rx={4} />
            <text x={530} y={406} textAnchor="middle" fontSize={9} fill="#5a4f44" fontFamily="DM Sans, sans-serif" letterSpacing="0.1em" fontWeight="600">LOUNGE</text>
            <text x={530} y={419} textAnchor="middle" fontSize={7} fill="#a09890" fontFamily="DM Sans, sans-serif">Integrado</text>

            {/* ── Tables ── */}
            {TABLE_POSITIONS.map((pos) => {
              const table = tableByNumber.get(pos.number);
              if (!table) return null;

              const count = guestCounts.get(table.id) ?? 0;
              const status = getTableStatus(count, table.capacity);
              const radius = pos.large ? TABLE_RADIUS_LARGE : TABLE_RADIUS_NORMAL;
              const isSelected = selectedTableId === table.id;
              const isDragOver = dragOverTableId === table.id;

              const fill = isDragOver ? "#bfdbfe" : isSelected ? "#1c1917" : STATUS_FILL[status];
              const stroke = isDragOver ? "#3b82f6" : isSelected ? "#1c1917" : STATUS_STROKE[status];
              const textColor = isSelected ? "#f8f5ef" : "#1c1917";
              const subColor = isSelected ? "#d6d3d1" : "#8a7f72";
              const companyColor = isSelected ? "#e7e5e4" : "#5a4f44";

              // Company name display — 2 lines if needed
              const company = table.companyName ?? "";
              const maxChars = pos.large ? 14 : 10;
              const companyLine1 = truncateCompany(company, maxChars);

              // Layout: number at top, company in middle, count at bottom
              const hasCompany = company.length > 0;
              const numY = pos.y + (hasCompany ? -10 : -4);
              const companyY = pos.y + 4;
              const countY = pos.y + (hasCompany ? 15 : 8);

              return (
                <g
                  key={pos.number}
                  className="table-node"
                  style={{ cursor: "pointer" }}
                  onClick={() => onTableClick(table.id)}
                  onDragOver={(e) => handleDragOver(e, table.id)}
                  onDrop={(e) => handleDrop(e, table.id)}
                  onDragLeave={handleDragLeave}
                  onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y, tableId: table.id })}
                  onMouseLeave={() => setTooltip(null)}
                  role="button"
                  aria-label={`Mesa ${pos.number}${company ? ` — ${company}` : ""}, ${count}/${table.capacity} lugares`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onTableClick(table.id)}
                >
                  {/* Chair dots around the table */}
                  {Array.from({ length: Math.min(table.capacity, 14) }).map((_, i) => {
                    const angle = (i / Math.min(table.capacity, 14)) * 2 * Math.PI - Math.PI / 2;
                    const cr = radius + 8;
                    const cx = pos.x + cr * Math.cos(angle);
                    const cy = pos.y + cr * Math.sin(angle);
                    const seated = i < count;
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={seated ? (isSelected ? "#a8a29e" : "#78716c") : "#ddd6cc"}
                        stroke="none"
                      />
                    );
                  })}

                  {/* Table circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected || isDragOver ? 2.5 : 1.5}
                  />

                  {/* Large table inner ring */}
                  {pos.large && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius - 6}
                      fill="none"
                      stroke={isSelected ? "#a8a29e" : "#c8bfb0"}
                      strokeWidth={1}
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Table number */}
                  <text
                    x={pos.x}
                    y={numY + 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={pos.large ? 12 : 11}
                    fontWeight="700"
                    fill={textColor}
                    fontFamily="Playfair Display, serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {String(pos.number).padStart(2, "0")}
                  </text>

                  {/* Company name — shown directly on the table */}
                  {hasCompany && (
                    <text
                      x={pos.x}
                      y={companyY + 4}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={pos.large ? 7.5 : 6.5}
                      fontWeight="600"
                      fill={companyColor}
                      fontFamily="DM Sans, sans-serif"
                      letterSpacing="0.03em"
                      style={{ pointerEvents: "none" }}
                    >
                      {companyLine1}
                    </text>
                  )}

                  {/* Guest count */}
                  <text
                    x={pos.x}
                    y={countY + 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={6.5}
                    fill={subColor}
                    fontFamily="DM Sans, sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {count}/{table.capacity}
                  </text>
                </g>
              );
            })}

            {/* ── Tooltip (shown on hover) ── */}
            {tooltip && (() => {
              const t = tables.find((tb) => tb.id === tooltip.tableId);
              const pos = TABLE_POSITIONS.find((p) => t && p.number === t.tableNumber);
              if (!t || !pos) return null;
              const cnt = guestCounts.get(t.id) ?? 0;
              const radius = pos.large ? TABLE_RADIUS_LARGE : TABLE_RADIUS_NORMAL;
              const company = t.companyName ?? "Sem empresa";
              const tw = Math.max(company.length * 6.2 + 20, 100);
              const tx = Math.min(Math.max(pos.x - tw / 2, 58), CANVAS_WIDTH - tw - 58);
              const ty = pos.y - radius - 42;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx} y={ty} width={tw} height={32} rx={4} fill="#1c1917" opacity={0.92} />
                  <text x={tx + tw / 2} y={ty + 12} textAnchor="middle" fontSize={8} fill="#f8f5ef" fontFamily="DM Sans, sans-serif" fontWeight="600">{company}</text>
                  <text x={tx + tw / 2} y={ty + 24} textAnchor="middle" fontSize={7} fill="#a8a29e" fontFamily="DM Sans, sans-serif">Mesa {pos.number} · {cnt}/{t.capacity} lugares</text>
                </g>
              );
            })()}

            {/* ── Legend ── */}
            <g transform={`translate(${CANVAS_WIDTH - 200}, ${CANVAS_HEIGHT - 28})`}>
              {[
                { color: STATUS_FILL.empty, stroke: STATUS_STROKE.empty, label: "Vazia" },
                { color: STATUS_FILL.partial, stroke: STATUS_STROKE.partial, label: "Parcial" },
                { color: STATUS_FILL.full, stroke: STATUS_STROKE.full, label: "Cheia" },
              ].map((item, i) => (
                <g key={i} transform={`translate(${i * 64}, 0)`}>
                  <circle cx={8} cy={0} r={7} fill={item.color} stroke={item.stroke} strokeWidth={1.2} />
                  <text x={19} y={4} fontSize={8.5} fill="#8a7f72" fontFamily="DM Sans, sans-serif">{item.label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="shrink-0 px-3 py-1.5 text-center border-t border-[#e8e2d8]">
        <p className="text-[10px] text-[#b0a89e]">
          Scroll para zoom · Arraste para mover · Clique numa mesa para detalhes
        </p>
      </div>
    </div>
  );
}
