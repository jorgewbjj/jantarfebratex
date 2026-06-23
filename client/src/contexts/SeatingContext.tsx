import React, { createContext, useContext, useState } from "react";
import type { Guest } from "../../../drizzle/schema";
import type { PendingCompanyDrop } from "@/components/SuggestNeighborDialog";

export interface DraggedGuest {
  guest: Guest;
  sourceTableId: number | null; // null = from unassigned pool
}

/**
 * Represents a company group being dragged as a whole from the unassigned sidebar.
 * All guests in the group will be assigned together to the drop target.
 */
export interface DraggedCompany {
  companyName: string;
  guestIds: number[];
  guestCount: number;
}

interface SeatingContextValue {
  // Selected table for detail panel
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;

  // Single-guest drag state
  draggedGuest: DraggedGuest | null;
  setDraggedGuest: (dg: DraggedGuest | null) => void;

  // Company-group drag state
  draggedCompany: DraggedCompany | null;
  setDraggedCompany: (dc: DraggedCompany | null) => void;

  // Drag-over table highlight
  dragOverTableId: number | null;
  setDragOverTableId: (id: number | null) => void;

  // Import dialog
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;

  // Export dialog
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;

  // Pending company drop — set when capacity is exceeded, triggers SuggestNeighborDialog
  pendingCompanyDrop: PendingCompanyDrop | null;
  setPendingCompanyDrop: (drop: PendingCompanyDrop | null) => void;

  // Tables highlighted as suggestions in SuggestNeighborDialog
  highlightedTableIds: Set<number>;
  setHighlightedTableIds: (ids: Set<number>) => void;
}

const SeatingContext = createContext<SeatingContextValue | null>(null);

export function SeatingProvider({ children }: { children: React.ReactNode }) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [draggedGuest, setDraggedGuest] = useState<DraggedGuest | null>(null);
  const [draggedCompany, setDraggedCompany] = useState<DraggedCompany | null>(null);
  const [dragOverTableId, setDragOverTableId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingCompanyDrop, setPendingCompanyDrop] = useState<PendingCompanyDrop | null>(null);
  const [highlightedTableIds, setHighlightedTableIds] = useState<Set<number>>(new Set());

  return (
    <SeatingContext.Provider
      value={{
        selectedTableId,
        setSelectedTableId,
        draggedGuest,
        setDraggedGuest,
        draggedCompany,
        setDraggedCompany,
        dragOverTableId,
        setDragOverTableId,
        importDialogOpen,
        setImportDialogOpen,
        exportDialogOpen,
        setExportDialogOpen,
        pendingCompanyDrop,
        setPendingCompanyDrop,
        highlightedTableIds,
        setHighlightedTableIds,
      }}
    >
      {children}
    </SeatingContext.Provider>
  );
}

export function useSeating() {
  const ctx = useContext(SeatingContext);
  if (!ctx) throw new Error("useSeating must be used within SeatingProvider");
  return ctx;
}
