import React, { createContext, useContext, useState, useCallback } from "react";
import type { Guest, Table } from "../../../drizzle/schema";

export interface DraggedGuest {
  guest: Guest;
  sourceTableId: number | null; // null = from unassigned pool
}

interface SeatingContextValue {
  // Selected table for detail panel
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;

  // Drag state
  draggedGuest: DraggedGuest | null;
  setDraggedGuest: (dg: DraggedGuest | null) => void;

  // Drag-over table highlight
  dragOverTableId: number | null;
  setDragOverTableId: (id: number | null) => void;

  // Import dialog
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;

  // Export dialog
  exportDialogOpen: boolean;
  setExportDialogOpen: (open: boolean) => void;
}

const SeatingContext = createContext<SeatingContextValue | null>(null);

export function SeatingProvider({ children }: { children: React.ReactNode }) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [draggedGuest, setDraggedGuest] = useState<DraggedGuest | null>(null);
  const [dragOverTableId, setDragOverTableId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  return (
    <SeatingContext.Provider
      value={{
        selectedTableId,
        setSelectedTableId,
        draggedGuest,
        setDraggedGuest,
        dragOverTableId,
        setDragOverTableId,
        importDialogOpen,
        setImportDialogOpen,
        exportDialogOpen,
        setExportDialogOpen,
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
