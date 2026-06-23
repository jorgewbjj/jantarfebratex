import React, { useState } from "react";
import { Download, FileText, Table2, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";

interface ExportDialogProps {
  eventId: number;
}

export default function ExportDialog({ eventId }: ExportDialogProps) {
  const { exportDialogOpen, setExportDialogOpen } = useSeating();
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);

  const { data: report } = trpc.reports.seating.useQuery({ eventId });

  const handleClose = () => setExportDialogOpen(false);

  const exportCSV = () => {
    if (!report) return;
    setLoading("csv");
    try {
      const rows: string[][] = [["Mesa", "Empresa", "Convidado", "Empresa Convidado", "E-mail"]];
      for (const table of report.tables.sort((a, b) => a.tableNumber - b.tableNumber)) {
        if (table.guests.length === 0) {
          rows.push([String(table.tableNumber).padStart(2, "0"), table.companyName ?? "", "", "", ""]);
        } else {
          for (const g of table.guests) {
            rows.push([
              String(table.tableNumber).padStart(2, "0"),
              table.companyName ?? "",
              g.name,
              g.company ?? "",
              g.email ?? "",
            ]);
          }
        }
      }
      // Unassigned
      for (const g of report.unassigned) {
        rows.push(["—", "—", g.name, g.company ?? "", g.email ?? ""]);
      }

      const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seating-arrangement.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso");
    } catch (e) {
      toast.error("Erro ao exportar CSV");
    } finally {
      setLoading(null);
    }
  };

  const exportPDF = async () => {
    if (!report) return;
    setLoading("pdf");
    try {
      // Dynamic import to avoid SSR issues
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("DON CONCEPT", pageW / 2, 20, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Mapa de Assentos — Layout Corporativo", pageW / 2, 28, { align: "center" });
      doc.setDrawColor(200, 191, 176);
      doc.line(14, 32, pageW - 14, 32);

      // Summary
      const totalGuests = report.tables.reduce((s, t) => s + t.guests.length, 0);
      const totalCapacity = report.tables.reduce((s, t) => s + t.capacity, 0);
      doc.setFontSize(9);
      doc.setTextColor(107, 94, 82);
      doc.text(
        `Total de convidados: ${totalGuests}  |  Capacidade total: ${totalCapacity}  |  Não alocados: ${report.unassigned.length}`,
        pageW / 2,
        38,
        { align: "center" }
      );

      // Table data
      const tableData = report.tables
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((t) => [
          String(t.tableNumber).padStart(2, "0"),
          t.companyName ?? "—",
          `${t.guests.length}/${t.capacity}`,
          t.guests.map((g) => g.name).join(", ") || "—",
        ]);

      autoTable(doc, {
        startY: 44,
        head: [["Mesa", "Empresa", "Ocupação", "Convidados"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [28, 25, 23], textColor: [248, 245, 239], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 236, 228] },
        columnStyles: {
          0: { cellWidth: 14, halign: "center" },
          1: { cellWidth: 40 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });

      // Unassigned page
      if (report.unassigned.length > 0) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(28, 25, 23);
        doc.text("Convidados Não Alocados", 14, 20);
        doc.setDrawColor(200, 191, 176);
        doc.line(14, 24, pageW - 14, 24);

        autoTable(doc, {
          startY: 28,
          head: [["Nome", "Empresa", "E-mail"]],
          body: report.unassigned.map((g) => [g.name, g.company ?? "—", g.email ?? "—"]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [28, 25, 23], textColor: [248, 245, 239], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 236, 228] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(176, 168, 158);
        doc.text(
          `Gerado em ${new Date().toLocaleDateString("pt-BR")} — Página ${i} de ${pageCount}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save("seating-arrangement.pdf");
      toast.success("PDF exportado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalGuests = report?.tables.reduce((s, t) => s + t.guests.length, 0) ?? 0;
  const totalCapacity = report?.tables.reduce((s, t) => s + t.capacity, 0) ?? 0;

  return (
    <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-[#f8f5ef] border-[#e0d9d0]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-[#1c1917]">
            Exportar Mapa de Assentos
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {[
            { label: "Mesas", value: report?.tables.length ?? 0 },
            { label: "Alocados", value: totalGuests },
            { label: "Não alocados", value: report?.unassigned.length ?? 0 },
          ].map((s) => (
            <div key={s.label} className="text-center bg-[#e8e2d8] rounded-sm py-3">
              <p className="editorial-headline text-2xl text-[#1c1917]">{s.value}</p>
              <p className="editorial-label text-[#8a7f72] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rule-line my-2" />

        {/* Export options */}
        <div className="space-y-2">
          <button
            onClick={exportCSV}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 bg-white border border-[#e0d9d0] rounded-sm hover:border-[#c8bfb0] hover:bg-[#f0ece4] transition-all group"
          >
            <div className="w-10 h-10 rounded-sm bg-[#e8e2d8] flex items-center justify-center group-hover:bg-[#ddd6cc] transition-colors">
              <Table2 size={18} className="text-[#6b5e52]" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-[#1c1917] text-sm">Exportar CSV</p>
              <p className="text-xs text-[#8a7f72]">Planilha com todas as mesas e convidados</p>
            </div>
            <Download size={14} className="text-[#b0a89e] group-hover:text-[#6b5e52] transition-colors" />
          </button>

          <button
            onClick={exportPDF}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 bg-white border border-[#e0d9d0] rounded-sm hover:border-[#c8bfb0] hover:bg-[#f0ece4] transition-all group"
          >
            <div className="w-10 h-10 rounded-sm bg-[#e8e2d8] flex items-center justify-center group-hover:bg-[#ddd6cc] transition-colors">
              <FileText size={18} className="text-[#6b5e52]" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-[#1c1917] text-sm">Exportar PDF</p>
              <p className="text-xs text-[#8a7f72]">Relatório formatado com todas as mesas</p>
            </div>
            <Download size={14} className="text-[#b0a89e] group-hover:text-[#6b5e52] transition-colors" />
          </button>

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-4 p-4 bg-white border border-[#e0d9d0] rounded-sm hover:border-[#c8bfb0] hover:bg-[#f0ece4] transition-all group"
          >
            <div className="w-10 h-10 rounded-sm bg-[#e8e2d8] flex items-center justify-center group-hover:bg-[#ddd6cc] transition-colors">
              <Printer size={18} className="text-[#6b5e52]" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-[#1c1917] text-sm">Imprimir</p>
              <p className="text-xs text-[#8a7f72]">Visualização para impressão direta</p>
            </div>
          </button>
        </div>

        {loading && (
          <p className="text-xs text-center text-[#8a7f72] animate-pulse">
            Gerando {loading === "csv" ? "CSV" : "PDF"}...
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
