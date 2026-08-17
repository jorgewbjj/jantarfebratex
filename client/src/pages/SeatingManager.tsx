import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Download, LayoutGrid, Users, MapPin,
  PanelLeftOpen, PanelLeftClose, ChevronDown,
  Search, X, Image, BarChart2, Trash2,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import FloorMap from "@/components/FloorMap";
import TableDetailPanel from "@/components/TableDetailPanel";
import UnassignedSidebar from "@/components/UnassignedSidebar";
import ImportDialog from "@/components/ImportDialog";
import ExportDialog from "@/components/ExportDialog";
import { useSeating } from "@/contexts/SeatingContext";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";
import { Link } from "wouter";

interface SeatingManagerProps {
  eventId: number;
}

export default function SeatingManager({ eventId }: SeatingManagerProps) {
  const {
    selectedTableId, setSelectedTableId,
    setExportDialogOpen,
    companySearch, setCompanySearch,
    searchHighlightedTableIds, setSearchHighlightedTableIds,
  } = useSeating();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);

  const utils = trpc.useUtils();
  const deleteAllMutation = trpc.guests.deleteAll.useMutation({
    onSuccess: (data) => {
      utils.invalidate();
      toast.success(`${data.deletedGuests} convidados excluídos e todas as alocações de mesas foram limpas.`);
    },
    onError: () => toast.error("Erro ao excluir convidados"),
  });

  // Ref forwarded to FloorMap so we can capture the SVG for PNG export
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { data: tables = [], isLoading: tablesLoading } = trpc.tables.list.useQuery({ eventId });
  const { data: allGuests = [] } = trpc.guests.list.useQuery({ eventId });

  // Build guestCounts map: tableId → count
  const guestCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const g of allGuests) {
      if (g.tableId != null) map.set(g.tableId, (map.get(g.tableId) ?? 0) + 1);
    }
    return map;
  }, [allGuests]);

  // Build allInvitesDelivered map: tableId → true if ALL guests at that table have inviteDelivered
  const allInvitesDelivered = useMemo(() => {
    const map = new Map<number, boolean>();
    const byTable = new Map<number, boolean[]>();
    for (const g of allGuests) {
      if (g.tableId != null) {
        if (!byTable.has(g.tableId)) byTable.set(g.tableId, []);
        byTable.get(g.tableId)!.push(!!g.inviteDelivered);
      }
    }
    byTable.forEach((delivered, tableId) => {
      map.set(tableId, delivered.length > 0 && delivered.every((d) => d));
    });
    return map;
  }, [allGuests]);

  const totalSeated     = allGuests.filter((g) => g.tableId != null).length;
  const totalUnassigned = allGuests.filter((g) => g.tableId == null).length;
  const totalCapacity   = tables.reduce((s, t) => s + t.capacity, 0);
  const occupancyPct    = totalCapacity > 0 ? Math.round((totalSeated / totalCapacity) * 100) : 0;
  const totalInvitesDelivered = allGuests.filter((g) => g.inviteDelivered).length;

  const handleTableClick = (tableId: number) => {
    setSelectedTableId(selectedTableId === tableId ? null : tableId);
  };

  // ── Company search ──────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((q: string) => {
    setCompanySearch(q);
    if (!q.trim()) { setSearchHighlightedTableIds(new Set()); return; }
    const lower = q.toLowerCase();
    const matched = new Set<number>();
    for (const t of tables) {
      // Check companyNames JSON array
      if (t.companyNames) {
        try {
          const names = JSON.parse(t.companyNames) as string[];
          if (names.some((n) => n.toLowerCase().includes(lower))) { matched.add(t.id); continue; }
        } catch { /* fall through */ }
      }
      if (t.companyName?.toLowerCase().includes(lower)) matched.add(t.id);
    }
    setSearchHighlightedTableIds(matched);
  }, [tables, setCompanySearch, setSearchHighlightedTableIds]);

  const clearSearch = () => { setCompanySearch(""); setSearchHighlightedTableIds(new Set()); };

  // ── PNG export ──────────────────────────────────────────────────────────────
  const handleExportPng = async () => {
      const container = mapContainerRef.current;
      if (!container) { toast.error("Mapa não encontrado"); return; }
      setExportingPng(true);
      try {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(container, {
          backgroundColor: "#e8e4dc",
          pixelRatio: 2,
        });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "mapa-mesas-don-concept.png";
      a.click();
      toast.success("Mapa exportado como PNG!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar mapa");
    } finally {
      setExportingPng(false);
    }
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

  // ── Shared toolbar elements ─────────────────────────────────────────────────
  const searchBar = (
    <div className="relative flex items-center">
      <Search size={12} className="absolute left-2.5 text-[#b0a89e] pointer-events-none" />
      <input
        type="text"
        value={companySearch}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Buscar empresa..."
        className="h-8 pl-7 pr-7 text-xs bg-white border border-[#c8bfb0] rounded-sm text-[#1c1917] placeholder-[#b0a89e] focus:outline-none focus:border-[#8a7f72] w-40 md:w-48"
        aria-label="Buscar empresa no mapa"
      />
      {companySearch && (
        <button
          onClick={clearSearch}
          className="absolute right-2 text-[#b0a89e] hover:text-[#6b5e52]"
          aria-label="Limpar busca"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef] px-3 py-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-1.5 text-[#6b5e52] text-xs font-medium"
            aria-label={sidebarOpen ? "Fechar lista" : "Abrir lista"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1c1917] text-white text-[10px] font-bold">
              {totalUnassigned}
            </span>
          </button>

          {searchBar}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleExportPng}
              disabled={exportingPng}
              className="h-8 w-8 flex items-center justify-center text-[#6b5e52] hover:text-[#1c1917] disabled:opacity-40"
              aria-label="Exportar mapa PNG"
              title="Exportar mapa como PNG"
            >
              <Image size={15} />
            </button>
            <Link href="/relatorio">
              <button className="h-8 w-8 flex items-center justify-center text-[#6b5e52] hover:text-[#1c1917]" aria-label="Relatório" title="Relatório por empresa">
                <BarChart2 size={15} />
              </button>
            </Link>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#6b5e52]" onClick={() => setExportDialogOpen(true)} aria-label="Exportar CSV/PDF">
              <Download size={15} />
            </Button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden relative">
          {sidebarOpen && (
            <div className="absolute inset-y-0 left-0 z-30 w-72 shadow-xl">
              <UnassignedSidebar eventId={eventId} />
            </div>
          )}
          {sidebarOpen && (
            <div className="absolute inset-0 z-20 bg-black/20" onClick={() => setSidebarOpen(false)} />
          )}
          <div ref={mapContainerRef} className="flex-1 overflow-hidden bg-[#f4f0e8] relative">
            <FloorMap eventId={eventId} tables={tables} guestCounts={guestCounts} allInvitesDelivered={allInvitesDelivered} onTableClick={handleTableClick} />
          </div>
        </div>

        {selectedTableId && (
          <div className="shrink-0 h-[55vh] border-t-2 border-[#c8bfb0] bg-[#f8f5ef] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#e0d9d0]">
              <div className="w-8 h-1 bg-[#c8bfb0] rounded-full mx-auto" />
              <button onClick={() => setSelectedTableId(null)} className="absolute right-4 text-[#8a7f72] hover:text-[#1c1917]" aria-label="Fechar painel">
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TableDetailPanel eventId={eventId} tableId={selectedTableId} tables={tables} onClose={() => setSelectedTableId(null)} />
            </div>
          </div>
        )}

        <ImportDialog eventId={eventId} />
        <ExportDialog eventId={eventId} />
      </div>
    );
  }

  // ── Desktop / iPad landscape layout ────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top stats bar */}
      <div className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef] px-4 md:px-6 py-2.5 flex items-center gap-3 md:gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="shrink-0 text-[#8a7f72] hover:text-[#1c1917] transition-colors"
          aria-label={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-3 md:gap-5 flex-1 overflow-x-auto">
          {[
            { icon: LayoutGrid, label: "Mesas",         value: tables.length },
            { icon: Users,      label: "Alocados",      value: totalSeated },
            { icon: MapPin,     label: "Não alocados",  value: totalUnassigned },
            { icon: MailCheck,   label: "Convites",      value: `${totalInvitesDelivered}/${totalSeated}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5 shrink-0">
              <Icon size={13} className="text-[#b0a89e]" />
              <span className="editorial-label text-[#8a7f72] hidden sm:inline">{label}</span>
              <span className="font-serif font-bold text-[#1c1917] text-sm">{value}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 shrink-0">
            <span className="editorial-label text-[#8a7f72] hidden md:inline">Ocupação</span>
            <div className="w-20 md:w-24 h-1.5 bg-[#e0d9d0] rounded-full overflow-hidden">
              <div className="h-full bg-[#1c1917] rounded-full transition-all duration-700" style={{ width: `${occupancyPct}%` }} />
            </div>
            <span className="text-xs text-[#6b5e52] font-medium">{occupancyPct}%</span>
          </div>
        </div>

        {/* Company search */}
        {searchBar}

        {/* Search result count badge */}
        {companySearch && (
          <span className="shrink-0 text-xs text-[#8a7f72] font-medium">
            {searchHighlightedTableIds.size} mesa{searchHighlightedTableIds.size !== 1 ? "s" : ""}
          </span>
        )}

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] gap-1.5"
            onClick={handleExportPng}
            disabled={exportingPng}
            title="Exportar mapa como PNG"
          >
            <Image size={12} />
            <span className="hidden md:inline">{exportingPng ? "Gerando..." : "PNG"}</span>
          </Button>

          <Link href="/relatorio">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] gap-1.5"
              title="Relatório por empresa"
            >
              <BarChart2 size={12} />
              <span className="hidden md:inline">Relatório</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] gap-1.5"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download size={12} />
            <span className="hidden sm:inline">Exportar</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                title="Excluir todos os convidados"
              >
                <Trash2 size={12} />
                <span className="hidden md:inline">Limpar Tudo</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os convidados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá <strong>apagar permanentemente todos os convidados</strong> e <strong>remover todas as alocações de mesas</strong> (nomes de empresas atribuídos às mesas também serão removidos). Esta operação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteAllMutation.mutate({ eventId })}
                >
                  Sim, excluir tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main layout: sidebar | map | detail panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`shrink-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? "w-64 md:w-72" : "w-0"}`}>
          <UnassignedSidebar eventId={eventId} />
        </div>

        <div ref={mapContainerRef} className="flex-1 overflow-hidden bg-[#f4f0e8] relative">
          <FloorMap eventId={eventId} tables={tables} guestCounts={guestCounts} allInvitesDelivered={allInvitesDelivered} onTableClick={handleTableClick} />
        </div>

        <div className={`shrink-0 overflow-hidden transition-all duration-300 ${selectedTableId ? "w-72 md:w-80" : "w-0"}`}>
          {selectedTableId && (
            <TableDetailPanel eventId={eventId} tableId={selectedTableId} tables={tables} onClose={() => setSelectedTableId(null)} />
          )}
        </div>
      </div>

      <ImportDialog eventId={eventId} />
      <ExportDialog eventId={eventId} />
    </div>
  );
}
