import React, { useMemo, useState } from "react";
import { Download, LayoutGrid, Users, MapPin, PanelLeftOpen, PanelLeftClose, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import FloorMap from "@/components/FloorMap";
import TableDetailPanel from "@/components/TableDetailPanel";
import UnassignedSidebar from "@/components/UnassignedSidebar";
import ImportDialog from "@/components/ImportDialog";
import ExportDialog from "@/components/ExportDialog";
import { useSeating } from "@/contexts/SeatingContext";
import { useIsMobile } from "@/hooks/useMobile";

interface SeatingManagerProps {
  eventId: number;
}

export default function SeatingManager({ eventId }: SeatingManagerProps) {
  const { selectedTableId, setSelectedTableId, setExportDialogOpen } = useSeating();
  const isMobile = useIsMobile(); // true for screens < 768px
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
  const occupancyPct = totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0;

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

  // ── Mobile / iPad layout ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef] px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 text-[#6b5e52] text-xs font-medium"
            aria-label={sidebarOpen ? "Fechar lista" : "Abrir lista"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="hidden sm:inline">Convidados</span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1c1917] text-white text-[10px] font-bold">
              {totalUnassigned}
            </span>
          </button>

          <div className="flex-1 flex items-center gap-3 justify-center">
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-[#b0a89e]" />
              <span className="text-xs text-[#6b5e52]">{totalSeated} alocados</span>
            </div>
            <div className="w-16 h-1.5 bg-[#e0d9d0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1c1917] rounded-full"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <span className="text-xs text-[#6b5e52] font-medium">{occupancyPct}%</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#6b5e52]"
            onClick={() => setExportDialogOpen(true)}
            aria-label="Exportar"
          >
            <Download size={15} />
          </Button>
        </div>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar — slides in as overlay on mobile */}
          {sidebarOpen && (
            <div className="absolute inset-y-0 left-0 z-30 w-72 shadow-xl">
              <UnassignedSidebar eventId={eventId} />
            </div>
          )}

          {/* Backdrop when sidebar open on mobile */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-20 bg-black/20"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Floor map — full width */}
          <div className="flex-1 overflow-hidden bg-[#f4f0e8] relative">
            <FloorMap
              eventId={eventId}
              tables={tables}
              guestCounts={guestCounts}
              onTableClick={handleTableClick}
            />
          </div>
        </div>

        {/* Detail panel — bottom sheet on mobile */}
        {selectedTableId && (
          <div className="shrink-0 h-[55vh] border-t-2 border-[#c8bfb0] bg-[#f8f5ef] overflow-hidden flex flex-col">
            {/* Drag handle */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0d9d0]">
              <div className="w-8 h-1 bg-[#c8bfb0] rounded-full mx-auto" />
              <button
                onClick={() => setSelectedTableId(null)}
                className="absolute right-4 text-[#8a7f72] hover:text-[#1c1917]"
                aria-label="Fechar painel"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TableDetailPanel
                eventId={eventId}
                tableId={selectedTableId}
                tables={tables}
                onClose={() => setSelectedTableId(null)}
              />
            </div>
          </div>
        )}

        {/* Dialogs */}
        <ImportDialog eventId={eventId} />
        <ExportDialog eventId={eventId} />
      </div>
    );
  }

  // ── Desktop / iPad landscape layout ──────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef] px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-3 md:gap-6">
        {/* Sidebar toggle — visible on tablet */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="shrink-0 text-[#8a7f72] hover:text-[#1c1917] transition-colors"
          aria-label={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
          title={sidebarOpen ? "Ocultar lista de convidados" : "Mostrar lista de convidados"}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="flex items-center gap-3 md:gap-6 flex-1 overflow-x-auto">
          {[
            { icon: LayoutGrid, label: "Mesas", value: tables.length },
            { icon: Users, label: "Alocados", value: totalSeated },
            { icon: MapPin, label: "Não alocados", value: totalUnassigned },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <Icon size={13} className="text-[#b0a89e]" />
              <span className="editorial-label text-[#8a7f72] hidden sm:inline">{label}</span>
              <span className="font-serif font-bold text-[#1c1917] text-sm">{value}</span>
            </div>
          ))}

          {/* Occupancy bar */}
          <div className="flex items-center gap-2 ml-1 shrink-0">
            <span className="editorial-label text-[#8a7f72] hidden md:inline">Ocupação</span>
            <div className="w-20 md:w-24 h-1.5 bg-[#e0d9d0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1c1917] rounded-full transition-all duration-700"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <span className="text-xs text-[#6b5e52] font-medium">{occupancyPct}%</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] gap-1.5"
          onClick={() => setExportDialogOpen(true)}
        >
          <Download size={12} />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      {/* Main layout: sidebar | map | detail panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unassigned sidebar — collapsible */}
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? "w-64 md:w-72" : "w-0"
          }`}
        >
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

        {/* Table detail panel — slides in from right */}
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ${
            selectedTableId ? "w-72 md:w-80" : "w-0"
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
