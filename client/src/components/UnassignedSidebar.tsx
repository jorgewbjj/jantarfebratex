/**
 * UnassignedSidebar
 *
 * Two drag modes:
 *  1. Single-guest drag  — drag an individual GuestPill → sets draggedGuest
 *  2. Company-group drag — drag the company header row → sets draggedCompany
 *     When dropped on a table, all guests in that company are assigned at once
 *     (capacity validation happens server-side via guests.bulkAssign).
 */

import React, { useState } from "react";
import { Search, Upload, Users, GripVertical, X, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSeating } from "@/contexts/SeatingContext";
import type { Guest } from "../../../drizzle/schema";

interface UnassignedSidebarProps {
  eventId: number;
}

export default function UnassignedSidebar({ eventId }: UnassignedSidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const {
    setDraggedGuest,
    setDraggedCompany,
    setImportDialogOpen,
  } = useSeating();
  const utils = trpc.useUtils();

  const { data: unassigned = [], isLoading } = trpc.guests.unassigned.useQuery({
    eventId,
    search: search || undefined,
  });

  const deleteMutation = trpc.guests.delete.useMutation({
    onSuccess: () => {
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      toast.success("Convidado removido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // Group by company — preserving sort order
  const byCompany = unassigned.reduce<Record<string, Guest[]>>((acc, g) => {
    const key = g.company ?? "— Sem empresa —";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g as Guest);
    return acc;
  }, {});

  const companies = Object.keys(byCompany).sort((a, b) => a.localeCompare(b));

  const toggleCollapse = (company: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#f0ece4] border-r border-[#e0d9d0]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-[#e0d9d0]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="editorial-label text-[#8a7f72] mb-0.5">Convidados</p>
            <h3 className="font-serif text-xl font-bold text-[#1c1917]">Não Alocados</h3>
          </div>
          <div className="text-right">
            <span className="editorial-headline text-3xl text-[#1c1917]">{unassigned.length}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0a89e]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou empresa..."
            className="pl-8 h-8 text-xs bg-white border-[#c8bfb0] focus:border-[#1c1917]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0a89e] hover:text-[#1c1917]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Import button */}
      <div className="px-5 py-3 border-b border-[#e0d9d0]">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8] hover:text-[#1c1917] gap-1.5"
          onClick={() => setImportDialogOpen(true)}
        >
          <Upload size={12} />
          Importar Lista XLS
        </Button>
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-[#e8e2d8] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : unassigned.length === 0 ? (
          <div className="py-10 text-center">
            <Users size={28} className="mx-auto text-[#c8bfb0] mb-3" />
            {search ? (
              <p className="text-sm text-[#b0a89e]">Nenhum resultado para "{search}"</p>
            ) : (
              <>
                <p className="font-display text-xl italic text-[#c8bfb0]">Todos alocados!</p>
                <p className="text-xs text-[#b0a89e] mt-1">Importe uma lista para começar</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => {
              const guests = byCompany[company];
              const isCollapsed = collapsed.has(company);
              const isSemEmpresa = company === "— Sem empresa —";

              return (
                <div key={company} className="rounded-sm overflow-hidden border border-[#e0d9d0]">
                  {/* Company header — draggable as a group */}
                  <div
                    className={`flex items-center gap-2 px-2.5 py-2 bg-[#e8e2d8] hover:bg-[#ddd8cf] transition-colors ${
                      isSemEmpresa ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                    }`}
                    draggable={!isSemEmpresa}
                    onDragStart={
                      isSemEmpresa
                        ? undefined
                        : () => {
                            setDraggedCompany({
                              companyName: company,
                              guestIds: guests.map((g) => g.id),
                              guestCount: guests.length,
                            });
                          }
                    }
                    onDragEnd={
                      isSemEmpresa
                        ? undefined
                        : () => setDraggedCompany(null)
                    }
                    title={
                      isSemEmpresa
                        ? undefined
                        : `Arraste para alocar todos os ${guests.length} convidados de "${company}" em uma mesa`
                    }
                  >
                    {/* Drag handle — only for named companies */}
                    {!isSemEmpresa ? (
                      <GripVertical size={13} className="text-[#8a7f72] shrink-0" />
                    ) : (
                      <Building2 size={13} className="text-[#b0a89e] shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate leading-tight ${
                          isSemEmpresa ? "text-[#b0a89e] italic" : "text-[#1c1917]"
                        }`}
                      >
                        {company}
                      </p>
                    </div>

                    {/* Guest count badge */}
                    <span className="shrink-0 text-[10px] font-medium bg-[#c8bfb0] text-[#5a4f44] rounded-full px-1.5 py-0.5 leading-none">
                      {guests.length}
                    </span>

                    {/* Collapse toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(company); }}
                      className="shrink-0 text-[#8a7f72] hover:text-[#1c1917] transition-colors"
                      aria-label={isCollapsed ? "Expandir" : "Recolher"}
                    >
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Drag hint for named companies */}
                  {!isSemEmpresa && !isCollapsed && (
                    <div className="px-3 py-1 bg-[#f0ece4] border-b border-[#e0d9d0]">
                      <p className="text-[10px] text-[#b0a89e] italic">
                        Arraste o cabeçalho para alocar todos de uma vez
                      </p>
                    </div>
                  )}

                  {/* Individual guests */}
                  {!isCollapsed && (
                    <ul className="divide-y divide-[#e8e2d8] bg-white">
                      {guests.map((guest) => (
                        <GuestPill
                          key={guest.id}
                          guest={guest}
                          onDragStart={() =>
                            setDraggedGuest({ guest, sourceTableId: null })
                          }
                          onDragEnd={() => setDraggedGuest(null)}
                          onDelete={() =>
                            deleteMutation.mutate({ guestId: guest.id })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-[#e0d9d0]">
        <p className="text-[10px] text-[#b0a89e] text-center leading-tight">
          Arraste um convidado ou o cabeçalho da empresa para uma mesa
        </p>
      </div>
    </div>
  );
}

function GuestPill({
  guest,
  onDragStart,
  onDragEnd,
  onDelete,
}: {
  guest: Guest;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className="guest-pill group flex items-center gap-2 px-2.5 py-2 hover:bg-[#faf8f3] transition-colors cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <GripVertical
        size={12}
        className="text-[#c8bfb0] shrink-0 group-hover:text-[#8a7f72] transition-colors"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1c1917] truncate leading-tight">
          {guest.name}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-[#b0a89e] hover:text-red-500 transition-all shrink-0"
        onClick={onDelete}
        title="Remover convidado"
      >
        <X size={10} />
      </Button>
    </li>
  );
}
