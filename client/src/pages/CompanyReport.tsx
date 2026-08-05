/**
 * CompanyReport — Relatório por Empresa
 *
 * Lists every company with their assigned tables, guest count, and capacity.
 * Provides a PDF export using jsPDF + jspdf-autotable.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileDown, Users, LayoutGrid, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "wouter";

interface CompanyReportProps {
  eventId: number;
}

export default function CompanyReport({ eventId }: CompanyReportProps) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: report = [], isLoading } = trpc.reports.company.useQuery({ eventId });

  const totalGuests   = report.reduce((s, r) => s + r.guestCount, 0);
  const totalCompanies = report.filter((r) => r.company !== "— Sem empresa —").length;

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const now   = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

      // ── Header ──
      doc.setFillColor(28, 25, 23);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(248, 245, 239);
      doc.text("DON CONCEPT", 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(168, 162, 158);
      doc.text("Relatório por Empresa — Layout Corporativo", 14, 21);
      doc.text(`Gerado em ${now}`, pageW - 14, 21, { align: "right" });

      // ── Summary ──
      doc.setFontSize(9);
      doc.setTextColor(90, 79, 68);
      doc.text(`${totalCompanies} empresa${totalCompanies !== 1 ? "s" : ""}  ·  ${totalGuests} convidado${totalGuests !== 1 ? "s" : ""} alocado${totalGuests !== 1 ? "s" : ""}`, 14, 36);

      // ── Table ──
      const rows = report.map((r) => [
        r.company,
        r.tableNumbers.map((n) => String(n).padStart(2, "0")).join(", "),
        String(r.tableNumbers.length),
        String(r.guestCount),
        String(r.totalCapacity),
        `${r.totalCapacity > 0 ? Math.round((r.guestCount / r.totalCapacity) * 100) : 0}%`,
      ]);

      autoTable(doc, {
        startY: 42,
        head: [["Empresa", "Mesas", "Nº Mesas", "Convidados", "Capacidade", "Ocupação"]],
        body: rows,
        styles: { fontSize: 8.5, cellPadding: 3, font: "helvetica" },
        headStyles: { fillColor: [28, 25, 23], textColor: [248, 245, 239], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 245, 239] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 55, fontSize: 7.5 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer on each page
          const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(160, 152, 144);
          doc.text(
            `DON CONCEPT — Relatório por Empresa — Pág. ${data.pageNumber} / ${pageCount}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: "center" }
          );
        },
      });

      doc.save(`relatorio-empresas-don-concept-${now.replace(/\//g, "-")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f5ef] flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-[#1c1917] text-[#f8f5ef] px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <button className="flex items-center gap-2 text-[#a8a29e] hover:text-[#f8f5ef] transition-colors text-sm" aria-label="Voltar ao mapa">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Voltar ao mapa</span>
          </button>
        </Link>
        <div className="flex-1">
          <p className="text-[#a8a29e] text-[10px] uppercase tracking-widest font-medium">DON CONCEPT</p>
          <h1 className="font-serif text-xl font-bold leading-tight">Relatório por Empresa</h1>
        </div>
        <Button
          onClick={handleExportPdf}
          disabled={exportingPdf || isLoading}
          className="bg-[#f8f5ef] text-[#1c1917] hover:bg-[#e8e2d8] gap-2 text-sm font-medium"
          size="sm"
        >
          {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </header>

      {/* Summary bar */}
      <div className="shrink-0 border-b border-[#e0d9d0] bg-white px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} className="text-[#b0a89e]" />
          <span className="text-sm text-[#6b5e52]">
            <span className="font-bold text-[#1c1917]">{totalCompanies}</span> empresa{totalCompanies !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#b0a89e]" />
          <span className="text-sm text-[#6b5e52]">
            <span className="font-bold text-[#1c1917]">{totalGuests}</span> convidado{totalGuests !== 1 ? "s" : ""} alocado{totalGuests !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#c8bfb0]" />
          </div>
        ) : report.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-2xl italic text-[#c8bfb0] mb-2">Nenhum convidado alocado</p>
            <p className="text-sm text-[#b0a89e]">Importe a lista e aloque os convidados nas mesas para ver o relatório.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {report.map((row) => {
              const isExpanded = expandedCompany === row.company;
              const occupancy  = row.totalCapacity > 0 ? Math.round((row.guestCount / row.totalCapacity) * 100) : 0;
              const isSemEmpresa = row.company === "— Sem empresa —";

              return (
                <div key={row.company} className="bg-white border border-[#e8e2d8] rounded-sm overflow-hidden">
                  {/* Row header */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#faf8f3] transition-colors"
                    onClick={() => setExpandedCompany(isExpanded ? null : row.company)}
                    aria-expanded={isExpanded}
                  >
                    {/* Expand icon */}
                    <span className="shrink-0 text-[#b0a89e]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>

                    {/* Company name */}
                    <span className={`flex-1 font-medium text-sm ${isSemEmpresa ? "text-[#b0a89e] italic" : "text-[#1c1917]"}`}>
                      {row.company}
                    </span>

                    {/* Tables */}
                    <span className="hidden md:flex items-center gap-1.5 text-xs text-[#8a7f72] shrink-0 max-w-[220px] truncate">
                      <LayoutGrid size={11} className="text-[#c8bfb0] shrink-0" />
                      Mesa{row.tableNumbers.length !== 1 ? "s" : ""}{" "}
                      {row.tableNumbers.map((n) => String(n).padStart(2, "0")).join(", ")}
                    </span>

                    {/* Guest count */}
                    <span className="flex items-center gap-1.5 text-xs text-[#8a7f72] shrink-0 w-24 justify-end">
                      <Users size={11} className="text-[#c8bfb0]" />
                      {row.guestCount} / {row.totalCapacity}
                    </span>

                    {/* Occupancy bar */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0 w-28">
                      <div className="flex-1 h-1.5 bg-[#e8e2d8] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${occupancy}%`,
                            backgroundColor: occupancy >= 100 ? "#4ade80" : occupancy >= 60 ? "#93c5fd" : "#c8bfb0",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#b0a89e] font-medium w-8 text-right">{occupancy}%</span>
                    </div>
                  </button>

                  {/* Expanded guest list */}
                  {isExpanded && (
                    <div className="border-t border-[#f0ece4] px-5 py-3 bg-[#faf8f3]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {row.guests.map((g) => (
                          <div key={g.id} className="flex items-center gap-2 text-xs text-[#6b5e52]">
                            <span className="w-5 h-5 rounded-full bg-[#e8e2d8] flex items-center justify-center text-[9px] font-bold text-[#8a7f72] shrink-0">
                              {String(g.tableNumber).padStart(2, "0")}
                            </span>
                            <span className="truncate">{g.name}</span>
                          </div>
                        ))}
                      </div>
                      {/* Mobile: show tables */}
                      <div className="mt-2 pt-2 border-t border-[#e8e2d8] md:hidden">
                        <span className="text-[10px] text-[#b0a89e]">
                          Mesa{row.tableNumbers.length !== 1 ? "s" : ""}: {row.tableNumbers.map((n) => String(n).padStart(2, "0")).join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
