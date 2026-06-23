/**
 * SuggestNeighborDialog
 *
 * Shown when a company group is dropped on a table that doesn't have enough
 * free seats. It suggests the nearest tables that together can accommodate
 * the entire group, and lets the organizer confirm the distribution with one click.
 *
 * Distribution strategy:
 *   - Fill the target table first (if it has any free seats).
 *   - Then fill the next nearest table, and so on.
 *   - Each table gets the company name assigned automatically if it is empty.
 */

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapPin, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { findTableSetForGroup } from "@/lib/floorLayout";

export interface PendingCompanyDrop {
  companyName: string;
  guestIds: number[];
  targetTableNumber: number;
}

interface SuggestNeighborDialogProps {
  open: boolean;
  onClose: () => void;
  pending: PendingCompanyDrop | null;
  allTables: Array<{
    id: number;
    tableNumber: number;
    capacity: number;
    companyName: string | null;
  }>;
  guestCounts: Map<number, number>;
}

export default function SuggestNeighborDialog({
  open,
  onClose,
  pending,
  allTables,
  guestCounts,
}: SuggestNeighborDialogProps) {
  const utils = trpc.useUtils();

  // Compute the suggested table set
  const suggestion = useMemo(() => {
    if (!pending) return null;
    return findTableSetForGroup(
      pending.targetTableNumber,
      pending.guestIds.length,
      allTables,
      guestCounts
    );
  }, [pending, allTables, guestCounts]);

  const bulkAssignMutation = trpc.guests.bulkAssign.useMutation({
    onSuccess: () => {
      utils.guests.unassigned.invalidate();
      utils.guests.list.invalidate();
      utils.tables.list.invalidate();
      utils.tables.getGuests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!pending) return null;

  const totalAvailable = suggestion
    ? suggestion.reduce((sum, t) => sum + t.available, 0)
    : 0;
  const canFit = suggestion !== null && totalAvailable >= pending.guestIds.length;

  // Build the distribution plan: assign guests to tables in order
  const distributionPlan = useMemo(() => {
    if (!suggestion || !pending) return [];
    let remaining = [...pending.guestIds];
    return suggestion.map((table) => {
      const chunk = remaining.slice(0, table.available);
      remaining = remaining.slice(table.available);
      return { ...table, assignedIds: chunk };
    }).filter((t) => t.assignedIds.length > 0);
  }, [suggestion, pending]);

  const handleConfirm = async () => {
    if (!pending || distributionPlan.length === 0) return;

    // Fire all bulkAssign mutations in sequence
    let successCount = 0;
    for (const plan of distributionPlan) {
      try {
        await bulkAssignMutation.mutateAsync({
          guestIds: plan.assignedIds,
          tableId: plan.tableId,
          companyName: pending.companyName,
        });
        successCount += plan.assignedIds.length;
      } catch {
        // Error already shown by mutation onError
      }
    }

    if (successCount > 0) {
      toast.success(
        `${successCount} convidado${successCount !== 1 ? "s" : ""} de "${pending.companyName}" distribuído${successCount !== 1 ? "s" : ""} em ${distributionPlan.length} mesa${distributionPlan.length !== 1 ? "s" : ""}!`
      );
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#f8f5ef] border-[#e0d9d0]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-[#1c1917] flex items-center gap-2">
            <MapPin size={18} className="text-amber-600" />
            Mesas insuficientes
          </DialogTitle>
          <DialogDescription className="text-[#6b5e52] text-sm leading-relaxed">
            <strong className="text-[#1c1917]">"{pending.companyName}"</strong> tem{" "}
            <strong>{pending.guestIds.length} convidados</strong> mas a mesa{" "}
            <strong>{String(pending.targetTableNumber).padStart(2, "0")}</strong> não tem vagas suficientes.
            {canFit ? (
              <> Sugerimos distribuir nas <strong>{distributionPlan.length} mesas mais próximas</strong> abaixo.</>
            ) : (
              <> Não há vagas suficientes no salão para acomodar todos.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {canFit && distributionPlan.length > 0 ? (
          <div className="space-y-2 my-2">
            {distributionPlan.map((plan) => (
              <div
                key={plan.tableId}
                className="flex items-center gap-3 px-3 py-2.5 bg-white border border-[#e0d9d0] rounded-sm"
              >
                {/* Table number badge */}
                <div className="shrink-0 w-9 h-9 rounded-full bg-[#1c1917] flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white font-serif">
                    {String(plan.tableNumber).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {plan.companyName ? (
                    <p className="text-xs font-semibold text-[#1c1917] truncate">{plan.companyName}</p>
                  ) : (
                    <p className="text-xs text-[#b0a89e] italic">Mesa vazia</p>
                  )}
                  <p className="text-[11px] text-[#8a7f72]">
                    {plan.available} lugar{plan.available !== 1 ? "es" : ""} disponível{plan.available !== 1 ? "is" : ""}
                  </p>
                </div>

                {/* Guests to be assigned here */}
                <div className="shrink-0 flex items-center gap-1">
                  <Users size={12} className="text-[#8a7f72]" />
                  <span className="text-sm font-semibold text-[#1c1917]">
                    {plan.assignedIds.length}
                  </span>
                  <CheckCircle2 size={13} className="text-green-600 ml-1" />
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#e8e2d8] rounded-sm mt-1">
              <span className="text-xs text-[#6b5e52] font-medium">Total a alocar</span>
              <Badge variant="outline" className="border-[#c8bfb0] text-[#1c1917] font-semibold">
                {pending.guestIds.length} convidados · {distributionPlan.length} mesas
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4 bg-red-50 border border-red-200 rounded-sm my-2">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              O salão não tem vagas suficientes para acomodar todos os{" "}
              <strong>{pending.guestIds.length} convidados</strong> de "{pending.companyName}".
              Remova alguns convidados de outras mesas e tente novamente.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#c8bfb0] text-[#6b5e52] hover:bg-[#e8e2d8]"
          >
            Cancelar
          </Button>
          {canFit && (
            <Button
              onClick={handleConfirm}
              disabled={bulkAssignMutation.isPending}
              className="bg-[#1c1917] hover:bg-[#2d2926] text-white"
            >
              {bulkAssignMutation.isPending
                ? "Alocando..."
                : `Distribuir em ${distributionPlan.length} mesa${distributionPlan.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
