import React, { useState } from "react";
import { Download, FileText, Table2, Printer, Save, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";
import { useRef } from "react";

interface ExportDialogProps {
  eventId: number;
}

export default function ExportDialog({ eventId }: ExportDialogProps) {
  const { exportDialogOpen, setExportDialogOpen } = useSeating();
  const [loading, setLoading] = useState<"csv" | "pdf" | "backup" | "restore" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: report } = trpc.reports.seating.useQuery({ eventId });
  const utils = trpc.useUtils();

  const bulkImportMutation = trpc.guests.bulkImport.useMutation();
  const updateTableCompanyMutation = trpc.tables.addCompany.useMutation();
  const assignMutation = trpc.guests.assign.useMutation();

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

  const exportBackup = async () => {
    if (!report) return;
    setLoading("backup");
    try {
      const XLSX = await import("xlsx");

      // Sheet 1: Tables (Mesas)
      const tablesData = report.tables
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((t) => ({
          "Numero Mesa": t.tableNumber,
          "Empresas": (() => {
            if (t.companyNames) {
              try { return JSON.parse(t.companyNames).join(" / "); } catch { /* fall through */ }
            }
            return t.companyName ?? "";
          })(),
          "Capacidade": t.capacity,
          "Convidados Alocados": t.guests.length,
        }));

      // Sheet 2: All Guests (Convidados)
      const guestsData = [
        ...report.tables
          .sort((a, b) => a.tableNumber - b.tableNumber)
          .flatMap((t) =>
            t.guests.map((g) => ({
              "Empresa": g.company ?? "",
              "Nome Convidado": g.name,
              "Mesa": t.tableNumber,
              "Email": g.email ?? "",
              "Telefone": g.phone ?? "",
              "Convite Entregue": g.inviteDelivered ? "Sim" : "Nao",
            }))
          ),
        ...report.unassigned.map((g) => ({
          "Empresa": g.company ?? "",
          "Nome Convidado": g.name,
          "Mesa": "",
          "Email": g.email ?? "",
          "Telefone": g.phone ?? "",
          "Convite Entregue": g.inviteDelivered ? "Sim" : "Nao",
        })),
      ];

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(tablesData);
      const ws2 = XLSX.utils.json_to_sheet(guestsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Mesas");
      XLSX.utils.book_append_sheet(wb, ws2, "Convidados");

      XLSX.writeFile(wb, `backup-seating-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Backup exportado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar backup");
    } finally {
      setLoading(null);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading("restore");
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // Find the "Convidados" sheet
      const guestsSheet = wb.Sheets["Convidados"] || wb.Sheets[wb.SheetNames[1]] || wb.Sheets[wb.SheetNames[0]];
      if (!guestsSheet) throw new Error("Aba 'Convidados' não encontrada no arquivo");

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(guestsSheet);
      if (rows.length === 0) throw new Error("Nenhum convidado encontrado no backup");

      // Parse guests with their table assignments
      const guestsToImport: Array<{ name: string; company?: string; email?: string; phone?: string; tableNumber?: number; inviteDelivered?: boolean }> = [];

      for (const row of rows) {
        const name = String(row["Nome Convidado"] ?? "").trim();
        if (!name) continue;
        const company = String(row["Empresa"] ?? "").trim() || undefined;
        const email = String(row["Email"] ?? "").trim() || undefined;
        const phone = String(row["Telefone"] ?? "").trim() || undefined;
        const mesaRaw = row["Mesa"];
        const tableNumber = mesaRaw ? Number(mesaRaw) : undefined;
        const conviteRaw = String(row["Convite Entregue"] ?? "").trim().toLowerCase();
        const inviteDelivered = conviteRaw === "sim" || conviteRaw === "yes" || conviteRaw === "1" || conviteRaw === "true";
        guestsToImport.push({ name, company, email, phone, tableNumber: tableNumber && !isNaN(tableNumber) ? tableNumber : undefined, inviteDelivered });
      }

      if (guestsToImport.length === 0) throw new Error("Nenhum convidado válido encontrado");

      // Step 1: Import all guests (unassigned first)
      const importResult = await bulkImportMutation.mutateAsync({
        eventId,
        guests: guestsToImport.map((g) => ({
          name: g.name,
          company: g.company,
          email: g.email,
          phone: g.phone,
          inviteDelivered: g.inviteDelivered,
        })),
        importBatch: `backup-restore-${Date.now()}`,
      });

      // Step 2: Assign guests to their tables based on the backup
      // We need to get the fresh guest list and table list to map table numbers to IDs
      await utils.invalidate();

      // Get fresh data
      const freshReport = await utils.reports.seating.fetch({ eventId });
      if (freshReport) {
        const tableMap = new Map(freshReport.tables.map((t) => [t.tableNumber, t.id]));

        // Find the newly imported guests (they are unassigned)
        const unassignedByName = new Map<string, number>();
        for (const g of freshReport.unassigned) {
          // Use name + company as key to match
          const key = `${g.name}||${g.company ?? ""}`;
          unassignedByName.set(key, g.id);
        }

        // Assign guests to tables
        let assignedCount = 0;
        for (const g of guestsToImport) {
          if (!g.tableNumber) continue;
          const tableId = tableMap.get(g.tableNumber);
          if (!tableId) continue;
          const key = `${g.name}||${g.company ?? ""}`;
          const guestId = unassignedByName.get(key);
          if (!guestId) continue;
          try {
            await assignMutation.mutateAsync({ guestId, tableId });
            unassignedByName.delete(key); // Remove so duplicates don't match twice
            assignedCount++;
          } catch { /* skip if capacity full */ }
        }

        // Step 3: Restore company names on tables from the "Mesas" sheet
        const mesasSheet = wb.Sheets["Mesas"] || wb.Sheets[wb.SheetNames[0]];
        if (mesasSheet) {
          const mesasRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(mesasSheet);
          for (const row of mesasRows) {
            const tableNum = Number(row["Numero Mesa"]);
            const empresas = String(row["Empresas"] ?? "").trim();
            if (!tableNum || !empresas) continue;
            const tableId = tableMap.get(tableNum);
            if (!tableId) continue;
            // Add each company
            const companyList = empresas.split(" / ").map((c) => c.trim()).filter(Boolean);
            for (const company of companyList) {
              try {
                await updateTableCompanyMutation.mutateAsync({ tableId, companyName: company });
              } catch { /* skip duplicates */ }
            }
          }
        }

        toast.success(`Backup restaurado! ${importResult.count} convidados importados, ${assignedCount} alocados nas mesas.`);
      } else {
        toast.success(`${importResult.count} convidados importados (sem alocação de mesas).`);
      }

      await utils.invalidate();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao restaurar backup");
    } finally {
      setLoading(null);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          {/* Backup XLSX */}
          <button
            onClick={exportBackup}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 bg-white border-2 border-green-200 rounded-sm hover:border-green-400 hover:bg-green-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-sm bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Save size={18} className="text-green-700" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-[#1c1917] text-sm">Salvar Backup Completo</p>
              <p className="text-xs text-[#8a7f72]">XLSX com todos convidados, mesas e posições (pode restaurar depois)</p>
            </div>
            <Download size={14} className="text-green-600 group-hover:text-green-700 transition-colors" />
          </button>

          {/* Restore Backup */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-sm hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-sm bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Upload size={18} className="text-blue-700" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-[#1c1917] text-sm">Restaurar Backup</p>
              <p className="text-xs text-[#8a7f72]">Importar arquivo de backup e restaurar convidados + posições</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleRestoreBackup}
          />

          <div className="rule-line my-2" />

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
