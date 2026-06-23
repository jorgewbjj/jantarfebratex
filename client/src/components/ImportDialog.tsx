/**
 * ImportDialog — XLS/XLSX import with fixed column format:
 *   Column 1 (A) = Company name (Empresa)
 *   Column 2 (B) = Guest name   (Convidado)
 *
 * The "map columns" step is intentionally removed — the format is fixed and
 * documented clearly in the UI. A template download button is provided so
 * users can start with the correct structure immediately.
 *
 * Flow: upload → preview → done
 */

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Check,
  Download,
  AlertTriangle,
  Building2,
  Users,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedGuest {
  name: string;
  company: string;
  rowIndex: number; // 1-based original row number for error reporting
}

interface ParseWarning {
  row: number;
  message: string;
}

interface ImportDialogProps {
  eventId: number;
}

type Step = "upload" | "preview" | "done";

// ─── Template generator ───────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    ["Empresa", "Convidado"],          // header row
    ["Empresa Alpha", "João Silva"],
    ["Empresa Alpha", "Maria Santos"],
    ["Tech Corp", "Carlos Oliveira"],
    ["Tech Corp", "Ana Lima"],
    ["Grupo Beta", "Pedro Costa"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = [{ wch: 30 }, { wch: 30 }];

  XLSX.utils.book_append_sheet(wb, ws, "Convidados");
  XLSX.writeFile(wb, "template_convidados.xlsx");
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse the XLS/XLSX file using the fixed format:
 *   Column index 0 (A) = company
 *   Column index 1 (B) = guest name
 *
 * Handles both files with and without a header row:
 * - If the first row looks like a header (both cells are non-numeric strings
 *   that match common header keywords), it is skipped.
 * - Otherwise every row is treated as data.
 */
function parseXlsFixed(file: File): Promise<{ guests: ParsedGuest[]; warnings: ParseWarning[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("Arquivo sem planilhas"));
          return;
        }
        const sheet = workbook.Sheets[sheetName];

        // sheet_to_json with header:1 gives us raw arrays — no column-name dependency
        const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
          header: 1,
          defval: "",
        });

        if (rows.length === 0) {
          reject(new Error("Planilha vazia"));
          return;
        }

        // Detect and skip header row
        const HEADER_KEYWORDS = /empresa|company|convidado|guest|nome|name/i;
        let startRow = 0;
        const firstRow = rows[0];
        const col0 = String(firstRow?.[0] ?? "").trim();
        const col1 = String(firstRow?.[1] ?? "").trim();
        if (HEADER_KEYWORDS.test(col0) || HEADER_KEYWORDS.test(col1)) {
          startRow = 1; // skip header
        }

        const guests: ParsedGuest[] = [];
        const warnings: ParseWarning[] = [];

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          const company = String(row?.[0] ?? "").trim();
          const name = String(row?.[1] ?? "").trim();
          const rowNum = i + 1; // 1-based for display

          // Skip completely empty rows silently
          if (!company && !name) continue;

          if (!company) {
            warnings.push({ row: rowNum, message: `Linha ${rowNum}: empresa vazia — convidado "${name}" importado sem empresa` });
          }
          if (!name) {
            warnings.push({ row: rowNum, message: `Linha ${rowNum}: nome do convidado vazio — linha ignorada` });
            continue;
          }

          guests.push({ name, company: company || "", rowIndex: rowNum });
        }

        resolve({ guests, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportDialog({ eventId }: ImportDialogProps) {
  const { importDialogOpen, setImportDialogOpen } = useSeating();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([]);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const importMutation = trpc.guests.bulkImport.useMutation({
    onSuccess: (data) => {
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      toast.success(`${data.count} convidados importados com sucesso!`);
      setStep("done");
    },
    onError: (e) => toast.error("Erro na importação: " + e.message),
  });

  const handleClose = () => {
    setImportDialogOpen(false);
    setTimeout(() => {
      setStep("upload");
      setFile(null);
      setParsedGuests([]);
      setWarnings([]);
    }, 300);
  };

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Apenas arquivos XLS ou XLSX são suportados");
      return;
    }
    setFile(f);
    setIsParsing(true);
    try {
      const result = await parseXlsFixed(f);
      if (result.guests.length === 0) {
        toast.error("Nenhum convidado encontrado. Verifique se o arquivo segue o formato correto.");
        setIsParsing(false);
        return;
      }
      setParsedGuests(result.guests);
      setWarnings(result.warnings);
      setStep("preview");
    } catch (err) {
      toast.error("Erro ao processar arquivo: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    const batch = `import-${Date.now()}`;
    importMutation.mutate({
      eventId,
      guests: parsedGuests.map((g) => ({
        name: g.name,
        company: g.company || undefined,
      })),
      importBatch: batch,
    });
  };

  // Unique companies count
  const uniqueCompanies = new Set(parsedGuests.map((g) => g.company).filter(Boolean)).size;

  return (
    <Dialog open={importDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg bg-[#f8f5ef] border-[#e0d9d0]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-[#1c1917]">
            Importar Lista de Convidados
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="space-y-5">
            {/* Format description */}
            <div className="bg-[#e8e2d8] rounded-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-[#5a4f44] uppercase tracking-wider">Formato esperado da planilha</p>
              <div className="overflow-hidden rounded-sm border border-[#c8bfb0]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1c1917] text-white">
                      <th className="px-3 py-1.5 text-left font-medium">Coluna A — Empresa</th>
                      <th className="px-3 py-1.5 text-left font-medium">Coluna B — Convidado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {[
                      ["Empresa Alpha", "João Silva"],
                      ["Empresa Alpha", "Maria Santos"],
                      ["Tech Corp", "Carlos Oliveira"],
                    ].map(([emp, guest], i) => (
                      <tr key={i} className="border-t border-[#e8e2d8]">
                        <td className="px-3 py-1 text-[#5a4f44]">{emp}</td>
                        <td className="px-3 py-1 text-[#1c1917]">{guest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#8a7f72]">
                A linha de cabeçalho é opcional — o sistema a detecta e ignora automaticamente.
                Cada linha representa um convidado.
              </p>
            </div>

            {/* Template download */}
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#c8bfb0] rounded-sm text-sm text-[#6b5e52] hover:bg-[#e8e2d8] transition-colors"
            >
              <Download size={14} />
              <span>Baixar template de exemplo (.xlsx)</span>
            </button>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-[#1c1917] bg-[#e8e2d8]"
                  : "border-[#c8bfb0] hover:border-[#8a7f72] hover:bg-[#f0ece4]"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#c8bfb0] border-t-[#1c1917] rounded-full animate-spin" />
                  <p className="text-sm text-[#6b5e52]">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet size={32} className="mx-auto text-[#c8bfb0] mb-3" />
                  <p className="text-sm font-medium text-[#6b5e52]">Clique ou arraste o arquivo aqui</p>
                  <p className="text-xs text-[#b0a89e] mt-1">XLS, XLSX — máx. 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="flex gap-3">
              <div className="flex-1 bg-[#e8e2d8] rounded-sm px-4 py-3 flex items-center gap-3">
                <Users size={16} className="text-[#8a7f72] shrink-0" />
                <div>
                  <p className="text-xs text-[#8a7f72]">Convidados</p>
                  <p className="font-serif font-bold text-lg text-[#1c1917]">{parsedGuests.length}</p>
                </div>
              </div>
              <div className="flex-1 bg-[#e8e2d8] rounded-sm px-4 py-3 flex items-center gap-3">
                <Building2 size={16} className="text-[#8a7f72] shrink-0" />
                <div>
                  <p className="text-xs text-[#8a7f72]">Empresas</p>
                  <p className="font-serif font-bold text-lg text-[#1c1917]">{uniqueCompanies}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#e8e2d8] rounded-sm text-xs text-[#6b5e52] truncate max-w-[140px]">
                <FileSpreadsheet size={13} className="shrink-0" />
                <span className="truncate">{file?.name}</span>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
                  <AlertTriangle size={13} />
                  {warnings.length} aviso{warnings.length > 1 ? "s" : ""} encontrado{warnings.length > 1 ? "s" : ""}
                </div>
                <ul className="text-xs text-amber-600 space-y-0.5 max-h-20 overflow-y-auto">
                  {warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div className="max-h-60 overflow-y-auto border border-[#e0d9d0] rounded-sm">
              <table className="w-full text-xs">
                <thead className="bg-[#1c1917] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-white">Empresa</th>
                    <th className="text-left px-3 py-2 font-medium text-white">Convidado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedGuests.slice(0, 100).map((g, i) => (
                    <tr key={i} className={`border-t border-[#e8e2d8] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f3]"}`}>
                      <td className="px-3 py-1.5 text-[#5a4f44]">
                        {g.company || <span className="text-[#c8bfb0] italic">sem empresa</span>}
                      </td>
                      <td className="px-3 py-1.5 text-[#1c1917] font-medium">{g.name}</td>
                    </tr>
                  ))}
                  {parsedGuests.length > 100 && (
                    <tr className="border-t border-[#e8e2d8]">
                      <td colSpan={2} className="px-3 py-2 text-center text-[#b0a89e] text-xs">
                        + {parsedGuests.length - 100} convidados adicionais...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-[#1c1917] hover:bg-[#2c2520] text-white"
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending
                  ? "Importando..."
                  : `Importar ${parsedGuests.length} convidados`}
              </Button>
              <Button
                variant="outline"
                className="border-[#c8bfb0] text-[#6b5e52]"
                onClick={() => { setStep("upload"); setFile(null); setParsedGuests([]); setWarnings([]); }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={28} className="text-green-600" />
            </div>
            <div>
              <p className="font-serif text-xl font-bold text-[#1c1917]">Importação concluída!</p>
              <p className="text-sm text-[#6b5e52] mt-1">
                Os convidados aparecem na barra lateral <strong>"Não Alocados"</strong>.
                <br />Arraste-os para as mesas no mapa.
              </p>
            </div>
            <Button className="bg-[#1c1917] hover:bg-[#2c2520] text-white px-8" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
