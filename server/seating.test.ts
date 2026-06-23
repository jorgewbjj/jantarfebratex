import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getDefaultEvent: vi.fn().mockResolvedValue({
    id: 1,
    name: "DON CONCEPT",
    description: "Test event",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  ensureTablesExist: vi.fn().mockResolvedValue(undefined),
  getTablesForEvent: vi.fn().mockResolvedValue([
    { id: 1, eventId: 1, tableNumber: 1, companyName: null, capacity: 10, notes: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 10, eventId: 1, tableNumber: 10, companyName: null, capacity: 20, notes: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 44, eventId: 1, tableNumber: 44, companyName: null, capacity: 20, notes: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateTableCompany: vi.fn().mockResolvedValue(undefined),
  updateTableNotes: vi.fn().mockResolvedValue(undefined),
  updateTableCapacity: vi.fn().mockResolvedValue(undefined),
  getGuestsForTable: vi.fn().mockResolvedValue([]),
  getGuestsForEvent: vi.fn().mockResolvedValue([]),
  getUnassignedGuests: vi.fn().mockResolvedValue([]),
  addGuest: vi.fn().mockResolvedValue({
    id: 1,
    eventId: 1,
    name: "João Silva",
    company: "Empresa X",
    email: null,
    phone: null,
    tableId: null,
    seatNumber: null,
    notes: null,
    confirmed: false,
    importBatch: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateGuest: vi.fn().mockResolvedValue(undefined),
  assignGuestToTable: vi.fn().mockResolvedValue(undefined),
  deleteGuest: vi.fn().mockResolvedValue(undefined),
  bulkInsertGuests: vi.fn().mockResolvedValue(3),
  getSeatingReport: vi.fn().mockResolvedValue({ tables: [], unassigned: [] }),
}));

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("event router", () => {
  it("getDefault returns the default event", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const event = await caller.event.getDefault();
    expect(event.name).toBe("DON CONCEPT");
    expect(event.id).toBe(1);
  });
});

describe("tables router", () => {
  it("list returns tables for event", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const tables = await caller.tables.list({ eventId: 1 });
    expect(tables).toHaveLength(3);
  });

  it("tables 10 and 44 have capacity 20", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const tables = await caller.tables.list({ eventId: 1 });
    const t10 = tables.find((t) => t.tableNumber === 10);
    const t44 = tables.find((t) => t.tableNumber === 44);
    expect(t10?.capacity).toBe(20);
    expect(t44?.capacity).toBe(20);
  });

  it("updateCompany returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.tables.updateCompany({ tableId: 1, companyName: "Empresa ABC" });
    expect(result.success).toBe(true);
  });
});

describe("guests router", () => {
  it("add creates a new guest", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const guest = await caller.guests.add({
      eventId: 1,
      name: "João Silva",
      company: "Empresa X",
    });
    expect(guest.name).toBe("João Silva");
    expect(guest.company).toBe("Empresa X");
    expect(guest.tableId).toBeNull();
  });

  it("assign moves guest to table", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.guests.assign({ guestId: 1, tableId: 1 });
    expect(result.success).toBe(true);
  });

  it("assign with null tableId unassigns guest", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.guests.assign({ guestId: 1, tableId: null });
    expect(result.success).toBe(true);
  });

  it("bulkImport inserts multiple guests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.guests.bulkImport({
      eventId: 1,
      guests: [
        { name: "Ana Costa", company: "Tech Corp" },
        { name: "Bruno Lima", company: "Design Co" },
        { name: "Carla Souza" },
      ],
      importBatch: "import-test-001",
    });
    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
  });

  it("delete removes a guest", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.guests.delete({ guestId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("reports router", () => {
  it("seating returns tables and unassigned", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const report = await caller.reports.seating({ eventId: 1 });
    expect(report).toHaveProperty("tables");
    expect(report).toHaveProperty("unassigned");
  });
});

describe("capacity rules", () => {
  it("only tables 10 and 44 have capacity 20", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const tables = await caller.tables.list({ eventId: 1 });
    const largeTables = tables.filter((t) => t.capacity === 20);
    const largeNumbers = largeTables.map((t) => t.tableNumber).sort((a, b) => a - b);
    expect(largeNumbers).toEqual([10, 44]);
  });
});
