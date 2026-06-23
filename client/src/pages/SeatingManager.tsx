import React, { useMemo } from "react";
import { Download, LayoutGrid, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import FloorMap from "@/components/FloorMap";
import TableDetailPanel from "@/components/TableDetailPanel";
import UnassignedSidebar from "@/components/UnassignedSidebar";
import ImportDialog from "@/components/ImportDialog";
import ExportDialog from "@/components/ExportDialog";
import { useSeating } from "@/contexts/SeatingContext";

interface SeatingManagerProps {
  eventId: number;
}

export default function SeatingManager({ eventId }: SeatingManagerProps) {
  const { selectedTableId, setSelectedTableId, setExportDialogOpen } = useSeating();

  const { data: tables = [], isLoading: tablesLoading } = trpc.tables.list.useQuery({ eventId });
  const { data: allGuests = [] } = trpc.guests.list.useQuery({ eventId });

  // Build guestCounts map: tableId → count
  const guestCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const g of allGuests) {
      if (g.tableId != null) {
        map.set(g.tableId, (map.get(g.tableId) ?? 0) + 1);
      }
    }
    return map;
  }, [allGuests]);

  const totalSeated = allGuests.filter((g) => g.tableId != null).length;
  const totalUnassigned = allGuests.filter((g) => g.tableId == null).length;
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);

  const handleTableClick = (tableId: number) => {
    setSelectedTableId(selectedTableId === tableId ? null : tableId);
  };

  if (tablesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#c8bfb0] border-t-[#1c1917] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-xl italic text-[#8a7f72]">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef] px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-6 flex-1">
          {[
            { icon: LayoutGrid, label: "Mesas", value: tables.length },
            { icon: Users, label: "Alocados", value: totalSeated },
            { icon: MapPin, label: "Não alocados", value: totalUnassigned },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={14} className="text-[#b0a89e]" />
              <span className="editorial-label text-[#8a7f72]">{label}</span>
              <span className="font-serif font-bold text-[#1c1917] text-sm">{value}</span>
            </div>
          ))}

          {/* Occupancy bar */}
          <div className="flex items-center gap-2 ml-2">
            <span className="editorial-label text-[#8a7f72]">Ocupação</span>
            <div className="w-24 h-1.5 bg-[#e0d9d0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1c1917] rounded-full transition-all duration-700"
                style={{ width: totalCapacity > 0 ? `${Math.round((totalSeated / totalCapacity) * 100)}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-[#6b5e52] font-medium">
              {totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0}%
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] gap-1.5"
          onClick={() => setExportDialogOpen(true)}
        >
          <Download size={12} />
          Exportar
        </Button>
      </div>

      {/* Main layout: sidebar | map | detail panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unassigned sidebar */}
        <div className="w-64 shrink-0 overflow-hidden">
          <UnassignedSidebar eventId={eventId} />
        </div>

        {/* Floor map */}
        <div className="flex-1 overflow-hidden bg-[#f4f0e8] relative">
          <FloorMap
            eventId={eventId}
            tables={tables}
            guestCounts={guestCounts}
            onTableClick={handleTableClick}
          />
        </div>

        {/* Table detail panel */}
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ${
            selectedTableId ? "w-80" : "w-0"
          }`}
        >
          {selectedTableId && (
            <TableDetailPanel
              eventId={eventId}
              tableId={selectedTableId}
              tables={tables}
              onClose={() => setSelectedTableId(null)}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ImportDialog eventId={eventId} />
      <ExportDialog eventId={eventId} />
    </div>
  );
}
