import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, X, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";
import * as XLSX from "xlsx";

interface ParsedGuest {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

interface ImportDialogProps {
  eventId: number;
}

type Step = "upload" | "map" | "preview" | "done";

export default function ImportDialog({ eventId }: ImportDialogProps) {
  const { importDialogOpen, setImportDialogOpen } = useSeating();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [colName, setColName] = useState("");
  const [colCompany, setColCompany] = useState("");
  const [colEmail, setColEmail] = useState("");
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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
      setHeaders([]);
      setRawRows([]);
      setColName("");
      setColCompany("");
      setColEmail("");
      setParsedGuests([]);
    }, 300);
  };

  const parseFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        if (json.length === 0) { toast.error("Planilha vazia ou sem dados"); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        // Auto-detect columns
        const nameGuess = hdrs.find((h) => /nome|name/i.test(h)) ?? hdrs[0] ?? "";
        const companyGuess = hdrs.find((h) => /empresa|company|organiza/i.test(h)) ?? "";
        const emailGuess = hdrs.find((h) => /email|e-mail/i.test(h)) ?? "";
        setColName(nameGuess);
        setColCompany(companyGuess);
        setColEmail(emailGuess);
        setStep("map");
      } catch {
        toast.error("Erro ao ler arquivo. Verifique se é um XLS/XLSX válido.");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleFileChange = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { toast.error("Apenas arquivos XLS ou XLSX são suportados"); return; }
    setFile(f);
    parseFile(f);
  };

  const handlePreview = () => {
    if (!colName) { toast.error("Selecione a coluna de nome"); return; }
    const guests: ParsedGuest[] = rawRows
      .map((row) => ({
        name: String(row[colName] ?? "").trim(),
        company: colCompany ? String(row[colCompany] ?? "").trim() || undefined : undefined,
        email: colEmail ? String(row[colEmail] ?? "").trim() || undefined : undefined,
      }))
      .filter((g) => g.name.length > 0);
    if (guests.length === 0) { toast.error("Nenhum convidado encontrado com a coluna selecionada"); return; }
    setParsedGuests(guests);
    setStep("preview");
  };

  const handleImport = () => {
    const batch = `import-${Date.now()}`;
    importMutation.mutate({ eventId, guests: parsedGuests, importBatch: batch });
  };

  return (
    <Dialog open={importDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg bg-[#f8f5ef] border-[#e0d9d0]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-[#1c1917]">
            Importar Lista de Convidados
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-[#6b5e52]">
              Faça upload de um arquivo <strong>.XLS</strong> ou <strong>.XLSX</strong> com a lista de convidados.
              A planilha deve conter ao menos uma coluna com o nome dos convidados.
            </p>
            <div
              className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors cursor-pointer ${
                isDragging ? "border-[#1c1917] bg-[#e8e2d8]" : "border-[#c8bfb0] hover:border-[#8a7f72]"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileChange(f);
              }}
            >
              <FileSpreadsheet size={32} className="mx-auto text-[#c8bfb0] mb-3" />
              <p className="text-sm font-medium text-[#6b5e52]">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-[#b0a89e] mt-1">XLS, XLSX — máx. 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
          </div>
        )}

        {/* Step: Map columns */}
        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[#6b5e52] bg-[#e8e2d8] px-3 py-2 rounded-sm">
              <FileSpreadsheet size={14} />
              <span className="font-medium truncate">{file?.name}</span>
              <span className="text-[#b0a89e]">— {rawRows.length} linhas</span>
            </div>
            <p className="text-sm text-[#6b5e52]">Mapeie as colunas da planilha:</p>

            {[
              { label: "Coluna de Nome *", value: colName, setter: setColName, required: true },
              { label: "Coluna de Empresa", value: colCompany, setter: setColCompany, required: false },
              { label: "Coluna de E-mail", value: colEmail, setter: setColEmail, required: false },
            ].map(({ label, value, setter, required }) => (
              <div key={label}>
                <label className="editorial-label text-[#8a7f72] mb-1 block">{label}</label>
                <select
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full h-9 text-sm border border-[#c8bfb0] rounded-sm bg-white px-3 text-[#1c1917]"
                >
                  {!required && <option value="">— Não importar —</option>}
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-[#1c1917] hover:bg-[#2c2520] text-white"
                onClick={handlePreview}
                disabled={!colName}
              >
                Pré-visualizar
              </Button>
              <Button variant="outline" className="border-[#c8bfb0]" onClick={() => setStep("upload")}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[#6b5e52]">
              <Check size={14} className="text-green-600" />
              <span><strong>{parsedGuests.length}</strong> convidados prontos para importar</span>
            </div>

            <div className="max-h-64 overflow-y-auto border border-[#e0d9d0] rounded-sm">
              <table className="w-full text-xs">
                <thead className="bg-[#e8e2d8] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-[#6b5e52]">Nome</th>
                    <th className="text-left px-3 py-2 font-medium text-[#6b5e52]">Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedGuests.slice(0, 50).map((g, i) => (
                    <tr key={i} className="border-t border-[#e8e2d8]">
                      <td className="px-3 py-1.5 text-[#1c1917]">{g.name}</td>
                      <td className="px-3 py-1.5 text-[#8a7f72]">{g.company ?? "—"}</td>
                    </tr>
                  ))}
                  {parsedGuests.length > 50 && (
                    <tr className="border-t border-[#e8e2d8]">
                      <td colSpan={2} className="px-3 py-2 text-center text-[#b0a89e]">
                        + {parsedGuests.length - 50} convidados adicionais...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#1c1917] hover:bg-[#2c2520] text-white"
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? "Importando..." : `Importar ${parsedGuests.length} convidados`}
              </Button>
              <Button variant="outline" className="border-[#c8bfb0]" onClick={() => setStep("map")}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={24} className="text-green-600" />
            </div>
            <div>
              <p className="font-serif text-xl font-bold text-[#1c1917]">Importação concluída!</p>
              <p className="text-sm text-[#6b5e52] mt-1">
                Os convidados aparecem na barra lateral "Não Alocados".
              </p>
            </div>
            <Button className="bg-[#1c1917] hover:bg-[#2c2520] text-white" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
