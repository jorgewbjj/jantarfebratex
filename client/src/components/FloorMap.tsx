import React, { useRef } from "react";
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

export default function FloorMap({ eventId, tables, guestCounts, onTableClick }: FloorMapProps) {
  const { selectedTableId, draggedGuest, setDraggedGuest, dragOverTableId, setDragOverTableId } = useSeating();
  const utils = trpc.useUtils();
  const [tooltip, setTooltip] = React.useState<{ x: number; y: number; tableId: number } | null>(null);

  const assignMutation = trpc.guests.assign.useMutation({
    onSuccess: () => {
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      utils.tables.getGuests.invalidate();
    },
    onError: (err) => toast.error("Erro ao mover convidado: " + err.message),
  });

  // Build a map from tableNumber → table record
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

  return (
    <div className="w-full overflow-auto">
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="w-full"
        style={{ minWidth: 640, maxWidth: 1000 }}
        aria-label="Mapa de mesas DON CONCEPT"
      >
        {/* Background */}
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8f5ef" rx={4} />

        {/* Hall boundary */}
        <rect x={60} y={30} width={880} height={600} fill="none" stroke="#c8bfb0" strokeWidth={1.5} rx={2} />

        {/* Stage / presentation area */}
        <rect x={445} y={108} width={82} height={80} fill="#e2ddd5" stroke="#b8b0a4" strokeWidth={1.2} rx={3} />
        <text x={486} y={145} textAnchor="middle" fontSize={8} fill="#6b5e52" fontFamily="DM Sans, sans-serif" letterSpacing="0.12em" fontWeight="500">PALCO</text>
        <text x={486} y={157} textAnchor="middle" fontSize={7} fill="#b0a89e" fontFamily="DM Sans, sans-serif">/apresentação</text>

        {/* Lounge area */}
        <rect x={445} y={348} width={82} height={100} fill="#e8e4dc" stroke="#b8b0a4" strokeWidth={1.2} rx={3} />
        <text x={486} y={400} textAnchor="middle" fontSize={8} fill="#6b5e52" fontFamily="DM Sans, sans-serif" letterSpacing="0.12em" fontWeight="500">LOUNGE</text>

        {/* Buffet labels */}
        {[
          { x: 120, y: 50, label: "BUFFET" },
          { x: 220, y: 50, label: "BUFFET" },
          { x: 700, y: 50, label: "BUFFET" },
          { x: 800, y: 50, label: "BUFFET" },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x - 28} y={b.y - 12} width={56} height={20} fill="#e2ddd5" stroke="#c8bfb0" strokeWidth={0.8} rx={2} />
            <text x={b.x} y={b.y + 2} textAnchor="middle" fontSize={7} fill="#8a7f72" fontFamily="DM Sans, sans-serif" letterSpacing="0.1em">{b.label}</text>
          </g>
        ))}

        {/* Tables */}
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
          const textColor = isSelected ? "#f8f5ef" : "#2c2520";

          return (
            <g
              key={pos.number}
              className="table-node"
              onClick={() => onTableClick(table.id)}
              onDragOver={(e) => handleDragOver(e, table.id)}
              onDrop={(e) => handleDrop(e, table.id)}
              onDragLeave={handleDragLeave}
              onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y - radius - 14, tableId: table.id })}
              onMouseLeave={() => setTooltip(null)}
              role="button"
              aria-label={`Mesa ${pos.number}${table.companyName ? ` — ${table.companyName}` : ""}, ${count}/${table.capacity} lugares`}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onTableClick(table.id)}
            >
              {/* Chair dots around the table */}
              {Array.from({ length: Math.min(table.capacity, 12) }).map((_, i) => {
                const angle = (i / Math.min(table.capacity, 12)) * 2 * Math.PI - Math.PI / 2;
                const cr = radius + 7;
                const cx = pos.x + cr * Math.cos(angle);
                const cy = pos.y + cr * Math.sin(angle);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={i < count ? (isSelected ? "#a8a29e" : "#6b7280") : "#ddd6cc"}
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
                strokeWidth={isSelected || isDragOver ? 2 : 1.2}
              />

              {/* Large table indicator ring */}
              {pos.large && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius - 5}
                  fill="none"
                  stroke={isSelected ? "#a8a29e" : "#c8bfb0"}
                  strokeWidth={0.8}
                  strokeDasharray="3 2"
                />
              )}

              {/* Table number */}
              <text
                x={pos.x}
                y={pos.y - (table.companyName ? 5 : 1)}
                textAnchor="middle"
                fontSize={pos.large ? 11 : 10}
                fontWeight="700"
                fill={textColor}
                fontFamily="Playfair Display, serif"
              >
                {String(pos.number).padStart(2, "0")}
              </text>

              {/* Guest count */}
              <text
                x={pos.x}
                y={pos.y + (table.companyName ? 4 : 8)}
                textAnchor="middle"
                fontSize={7}
                fill={isSelected ? "#d6d3d1" : "#8a7f72"}
                fontFamily="DM Sans, sans-serif"
              >
                {count}/{table.capacity}
              </text>

              {/* Company name (truncated) */}
              {table.companyName && (
                <text
                  x={pos.x}
                  y={pos.y + 13}
                  textAnchor="middle"
                  fontSize={6}
                  fill={isSelected ? "#e7e5e4" : "#6b5e52"}
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="500"
                >
                  {table.companyName.length > 12
                    ? table.companyName.slice(0, 11) + "…"
                    : table.companyName}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const t = tables.find((tb) => tb.id === tooltip.tableId);
          const pos = TABLE_POSITIONS.find((p) => t && p.number === t.tableNumber);
          if (!t || !pos) return null;
          const cnt = guestCounts.get(t.id) ?? 0;
          const label = t.companyName ? t.companyName : "Sem empresa";
          const truncated = label.length > 20 ? label.slice(0, 19) + "…" : label;
          const tw = Math.max(truncated.length * 5.5 + 16, 80);
          const tx = Math.min(Math.max(tooltip.x - tw / 2, 62), CANVAS_WIDTH - tw - 62);
          const ty = tooltip.y - 28;
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect x={tx} y={ty} width={tw} height={24} rx={3} fill="#1c1917" opacity={0.9} />
              <text x={tx + tw / 2} y={ty + 10} textAnchor="middle" fontSize={7.5} fill="#f8f5ef" fontFamily="DM Sans, sans-serif" fontWeight="500">{truncated}</text>
              <text x={tx + tw / 2} y={ty + 19} textAnchor="middle" fontSize={7} fill="#a8a29e" fontFamily="DM Sans, sans-serif">{cnt}/{t.capacity} lugares</text>
            </g>
          );
        })()}

        {/* Legend */}
        <g transform={`translate(${CANVAS_WIDTH - 180}, ${CANVAS_HEIGHT - 60})`}>
          {[
            { color: STATUS_FILL.empty, stroke: STATUS_STROKE.empty, label: "Vazia" },
            { color: STATUS_FILL.partial, stroke: STATUS_STROKE.partial, label: "Parcial" },
            { color: STATUS_FILL.full, stroke: STATUS_STROKE.full, label: "Cheia" },
          ].map((item, i) => (
            <g key={i} transform={`translate(${i * 58}, 0)`}>
              <circle cx={8} cy={8} r={7} fill={item.color} stroke={item.stroke} strokeWidth={1} />
              <text x={18} y={12} fontSize={8} fill="#8a7f72" fontFamily="DM Sans, sans-serif">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
