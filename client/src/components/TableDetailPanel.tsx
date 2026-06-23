import React, { useState, useEffect } from "react";
import { X, Edit2, Check, UserMinus, UserPlus, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";
import type { Guest } from "../../../drizzle/schema";

interface TableDetailPanelProps {
  eventId: number;
  tableId: number | null;
  tables: Array<{ id: number; tableNumber: number; companyName: string | null; capacity: number }>;
  onClose: () => void;
}

export default function TableDetailPanel({ eventId, tableId, tables, onClose }: TableDetailPanelProps) {
  const { setDraggedGuest } = useSeating();
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestCompany, setNewGuestCompany] = useState("");
  const [reassigningGuest, setReassigningGuest] = useState<Guest | null>(null);
  const [reassignTarget, setReassignTarget] = useState<number | "">("");

  const utils = trpc.useUtils();

  const table = tables.find((t) => t.id === tableId);

  const { data: guests = [], isLoading } = trpc.tables.getGuests.useQuery(
    { tableId: tableId! },
    { enabled: !!tableId }
  );

  useEffect(() => {
    if (table) setCompanyInput(table.companyName ?? "");
  }, [table?.id, table?.companyName]);

  const updateCompany = trpc.tables.updateCompany.useMutation({
    onSuccess: () => {
      utils.tables.list.invalidate();
      setEditingCompany(false);
      toast.success("Empresa atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const assignMutation = trpc.guests.assign.useMutation({
    onSuccess: () => {
      utils.tables.getGuests.invalidate();
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      setReassigningGuest(null);
      setReassignTarget("");
      toast.success("Convidado movido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const removeGuest = trpc.guests.assign.useMutation({
    onSuccess: () => {
      utils.tables.getGuests.invalidate();
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      toast.success("Convidado removido da mesa");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const addGuestMutation = trpc.guests.add.useMutation({
    onSuccess: () => {
      utils.tables.getGuests.invalidate();
      utils.guests.list.invalidate();
      setAddingGuest(false);
      setNewGuestName("");
      setNewGuestCompany("");
      toast.success("Convidado adicionado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const deleteGuestMutation = trpc.guests.delete.useMutation({
    onSuccess: () => {
      utils.tables.getGuests.invalidate();
      utils.guests.list.invalidate();
      toast.success("Convidado excluído");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  if (!table) return null;

  const occupancy = guests.length;
  const capacity = table.capacity;
  const occupancyPct = Math.round((occupancy / capacity) * 100);

  const handleSaveCompany = () => {
    updateCompany.mutate({ tableId: table.id, companyName: companyInput.trim() || null });
  };

  const handleRemoveFromTable = (guest: Guest) => {
    removeGuest.mutate({ guestId: guest.id, tableId: null });
  };

  const handleReassign = () => {
    if (!reassigningGuest || !reassignTarget) return;
    const targetTable = tables.find((t) => t.id === Number(reassignTarget));
    if (!targetTable) return;
    assignMutation.mutate({ guestId: reassigningGuest.id, tableId: Number(reassignTarget) });
  };

  const handleAddGuest = () => {
    if (!newGuestName.trim()) return;
    addGuestMutation.mutate({
      eventId,
      name: newGuestName.trim(),
      company: newGuestCompany.trim() || undefined,
      tableId: table.id,
    });
  };

  const handleDragStart = (guest: Guest) => {
    setDraggedGuest({ guest, sourceTableId: table.id });
  };

  return (
    <div className="h-full flex flex-col bg-[#f8f5ef] border-l border-[#e0d9d0]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e0d9d0]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="editorial-label text-[#8a7f72] mb-1">Mesa</p>
            <h2 className="editorial-headline text-5xl text-[#1c1917]">
              {String(table.tableNumber).padStart(2, "0")}
            </h2>
            {table.capacity === 20 && (
              <span className="editorial-label text-[10px] text-[#6b7280] bg-[#e8e2d8] px-2 py-0.5 rounded-full mt-1 inline-block">
                Mesa Grande
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8a7f72] hover:text-[#1c1917] mt-1">
            <X size={18} />
          </Button>
        </div>

        {/* Company */}
        <div className="mt-4">
          <p className="editorial-label text-[#8a7f72] mb-1.5">Empresa</p>
          {editingCompany ? (
            <div className="flex gap-2">
              <Input
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Nome da empresa"
                className="h-8 text-sm bg-white border-[#c8bfb0] focus:border-[#1c1917]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveCompany()}
              />
              <Button size="icon" className="h-8 w-8 bg-[#1c1917] hover:bg-[#2c2520]" onClick={handleSaveCompany}>
                <Check size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCompany(false)}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingCompany(true)}
              className="flex items-center gap-2 group w-full text-left"
            >
              <span className="font-display text-lg text-[#1c1917] italic">
                {table.companyName || <span className="text-[#b0a89e] not-italic text-sm">Sem empresa atribuída</span>}
              </span>
              <Edit2 size={12} className="text-[#b0a89e] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Occupancy bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <p className="editorial-label text-[#8a7f72]">Ocupação</p>
            <span className="text-xs font-medium text-[#6b5e52]">{occupancy}/{capacity}</span>
          </div>
          <div className="h-1.5 bg-[#e0d9d0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${occupancyPct}%`,
                background: occupancyPct >= 100 ? "#4ade80" : occupancyPct > 0 ? "#93c5fd" : "#c8bfb0",
              }}
            />
          </div>
        </div>
      </div>

      {/* Guests list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="editorial-label text-[#8a7f72]">Convidados</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[#6b5e52] hover:text-[#1c1917] gap-1"
            onClick={() => setAddingGuest(!addingGuest)}
          >
            <UserPlus size={12} />
            Adicionar
          </Button>
        </div>

        {/* Add guest form */}
        {addingGuest && (
          <div className="mb-4 p-3 bg-white border border-[#e0d9d0] rounded-sm space-y-2">
            <Input
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              placeholder="Nome do convidado *"
              className="h-8 text-sm border-[#c8bfb0]"
              autoFocus
            />
            <Input
              value={newGuestCompany}
              onChange={(e) => setNewGuestCompany(e.target.value)}
              placeholder="Empresa (opcional)"
              className="h-8 text-sm border-[#c8bfb0]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-[#1c1917] hover:bg-[#2c2520] flex-1"
                onClick={handleAddGuest}
                disabled={!newGuestName.trim() || addGuestMutation.isPending}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setAddingGuest(false); setNewGuestName(""); setNewGuestCompany(""); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Reassign dialog */}
        {reassigningGuest && (
          <div className="mb-4 p-3 bg-white border border-[#e0d9d0] rounded-sm">
            <p className="text-xs text-[#6b5e52] mb-2">
              Mover <strong>{reassigningGuest.name}</strong> para:
            </p>
            <select
              value={reassignTarget}
              onChange={(e) => setReassignTarget(e.target.value as number | "")}
              className="w-full h-8 text-sm border border-[#c8bfb0] rounded-sm bg-white px-2 mb-2"
            >
              <option value="">Selecione uma mesa...</option>
              {tables
                .filter((t) => t.id !== table.id)
                .sort((a, b) => a.tableNumber - b.tableNumber)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    Mesa {String(t.tableNumber).padStart(2, "0")}
                    {t.companyName ? ` — ${t.companyName}` : ""}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-[#1c1917] hover:bg-[#2c2520] flex-1"
                onClick={handleReassign}
                disabled={!reassignTarget || assignMutation.isPending}
              >
                Mover
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReassigningGuest(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#e8e2d8] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : guests.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-display text-2xl italic text-[#c8bfb0]">Mesa vazia</p>
            <p className="text-xs text-[#b0a89e] mt-1">Arraste convidados para cá</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {guests.map((guest) => (
              <li
                key={guest.id}
                className="guest-pill group flex items-center gap-2 px-3 py-2 bg-white border border-[#e8e2d8] rounded-sm hover:border-[#c8bfb0] transition-colors"
                draggable
                onDragStart={() => handleDragStart(guest as Guest)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1c1917] truncate">{guest.name}</p>
                  {guest.company && (
                    <p className="text-xs text-[#8a7f72] truncate">{guest.company}</p>
                  )}
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#8a7f72] hover:text-[#1c1917]"
                    title="Mover para outra mesa"
                    onClick={() => setReassigningGuest(guest as Guest)}
                  >
                    <ArrowRight size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#8a7f72] hover:text-red-500"
                    title="Remover da mesa"
                    onClick={() => handleRemoveFromTable(guest as Guest)}
                  >
                    <UserMinus size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#8a7f72] hover:text-red-600"
                    title="Excluir convidado"
                    onClick={() => deleteGuestMutation.mutate({ guestId: guest.id })}
                  >
                    <X size={11} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
