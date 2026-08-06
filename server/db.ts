import { and, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { events, guests, tables, InsertGuest, InsertTable, User, users, InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getDefaultEvent() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(events).limit(1);
  if (result.length > 0) return result[0];
  // Create default event if none exists
  await db.insert(events).values({ name: "DON CONCEPT", description: "Layout corporativo com 70 mesas — Hanier" });
  const created = await db.select().from(events).limit(1);
  return created[0] ?? null;
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export async function getTablesForEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tables).where(eq(tables.eventId, eventId));
}

export async function ensureTablesExist(eventId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ tableNumber: tables.tableNumber }).from(tables).where(eq(tables.eventId, eventId));
  const existingNumbers = new Set(existing.map((t) => t.tableNumber));
  const toInsert: InsertTable[] = [];
  // Tables 10 and 44 seat 20 guests; all others seat 10
  const LARGE_TABLES = new Set([10, 44]);
  for (let i = 1; i <= 70; i++) {
    if (!existingNumbers.has(i)) {
      toInsert.push({ eventId, tableNumber: i, capacity: LARGE_TABLES.has(i) ? 20 : 10 });
    }
  }
  if (toInsert.length > 0) {
    await db.insert(tables).values(toInsert);
  }
}

export async function updateTableCompany(tableId: number, companyName: string | null) {
  const db = await getDb();
  if (!db) return;
  // When setting a single company name, also reset the companyNames array
  const companyNames = companyName ? JSON.stringify([companyName]) : null;
  await db.update(tables).set({ companyName, companyNames }).where(eq(tables.id, tableId));
}

/**
 * Adds a company name to the table's companyNames array (no duplicates).
 * Also keeps the legacy companyName field in sync (first company in array).
 */
export async function addCompanyToTable(tableId: number, companyName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ companyNames: tables.companyNames, companyName: tables.companyName }).from(tables).where(eq(tables.id, tableId)).limit(1);
  const row = rows[0];
  if (!row) return;

  // Parse existing array
  let names: string[] = [];
  if (row.companyNames) {
    try { names = JSON.parse(row.companyNames); } catch { names = []; }
  } else if (row.companyName) {
    names = [row.companyName];
  }

  // Add only if not already present
  if (!names.includes(companyName)) {
    names.push(companyName);
  }

  await db.update(tables).set({
    companyNames: JSON.stringify(names),
    companyName: names[0] ?? null, // keep legacy field in sync
  }).where(eq(tables.id, tableId));
}

/**
 * Removes a company name from the table's companyNames array.
 * Recomputes the legacy companyName field from the remaining array.
 */
export async function removeCompanyFromTable(tableId: number, companyName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select({ companyNames: tables.companyNames }).from(tables).where(eq(tables.id, tableId)).limit(1);
  const row = rows[0];
  if (!row) return;

  let names: string[] = [];
  if (row.companyNames) {
    try { names = JSON.parse(row.companyNames); } catch { names = []; }
  }

  names = names.filter((n) => n !== companyName);

  await db.update(tables).set({
    companyNames: names.length > 0 ? JSON.stringify(names) : null,
    companyName: names[0] ?? null,
  }).where(eq(tables.id, tableId));
}

export async function updateTableNotes(tableId: number, notes: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(tables).set({ notes }).where(eq(tables.id, tableId));
}

export async function updateTableCapacity(tableId: number, capacity: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tables).set({ capacity }).where(eq(tables.id, tableId));
}

export async function updateTablePosition(tableId: number, positionX: number, positionY: number, radiusOverride: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(tables).set({ positionX, positionY, radiusOverride }).where(eq(tables.id, tableId));
}

export async function resetTablePosition(tableId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(tables).set({ positionX: null, positionY: null, radiusOverride: null }).where(eq(tables.id, tableId));
}

// ─── Guests ───────────────────────────────────────────────────────────────────

export async function getGuestsForEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guests).where(eq(guests.eventId, eventId));
}

export async function getUnassignedGuests(eventId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(guests.eventId, eventId), isNull(guests.tableId)];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(like(guests.name, term), like(guests.company, term))!);
  }
  return db.select().from(guests).where(and(...conditions));
}

export async function getGuestsForTable(tableId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(guests).where(eq(guests.tableId, tableId));
}

export async function assignGuestToTable(guestId: number, tableId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(guests).set({ tableId }).where(eq(guests.id, guestId));
}

export async function addGuest(data: InsertGuest) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(guests).values(data);
  const insertId = (result as unknown as { insertId: number }[])[0]?.insertId ?? (result as unknown as { insertId: number }).insertId;
  if (!insertId) return null;
  const created = await db.select().from(guests).where(eq(guests.id, insertId)).limit(1);
  return created[0] ?? null;
}

export async function updateGuest(guestId: number, data: Partial<InsertGuest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(guests).set(data).where(eq(guests.id, guestId));
}

export async function deleteGuest(guestId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(guests).where(eq(guests.id, guestId));
}

/**
 * Delete ALL guests for an event and clear all table company assignments.
 * This is a destructive operation — all guest data and seating allocations are permanently removed.
 */
export async function deleteAllGuestsAndClearTables(eventId: number): Promise<{ deletedGuests: number }> {
  const db = await getDb();
  if (!db) return { deletedGuests: 0 };

  // Count guests before deletion
  const allGuests = await db.select().from(guests).where(eq(guests.eventId, eventId));
  const count = allGuests.length;

  // Delete all guests for this event
  await db.delete(guests).where(eq(guests.eventId, eventId));

  // Clear company names from all tables for this event
  await db.update(tables)
    .set({ companyName: null, companyNames: null })
    .where(eq(tables.eventId, eventId));

  return { deletedGuests: count };
}

/**
 * Bulk-assign a list of guests to a table, enforcing capacity.
 * Returns { success: true, count } or throws with a descriptive message.
 */
export async function bulkAssignGuests(
  guestIds: number[],
  tableId: number,
  companyName?: string | null
): Promise<{ count: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (guestIds.length === 0) return { count: 0 };

  // 1. Fetch table to check capacity
  const tableRows = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
  const table = tableRows[0];
  if (!table) throw new Error(`Mesa não encontrada (id=${tableId})`);

  // 2. Count guests already seated at this table
  const seated = await db
    .select({ count: sql<number>`count(*)` })
    .from(guests)
    .where(eq(guests.tableId, tableId));
  const currentCount = Number(seated[0]?.count ?? 0);
  const available = table.capacity - currentCount;

  if (guestIds.length > available) {
    throw new Error(
      `Capacidade insuficiente: mesa ${table.tableNumber} tem apenas ${available} lugar${available !== 1 ? "es" : ""} disponível${available !== 1 ? "is" : ""} (capacidade ${table.capacity}, ocupada ${currentCount})`
    );
  }

  // 3. Assign all guests in one update
  await db.update(guests).set({ tableId }).where(inArray(guests.id, guestIds));

  // 4. Add company to the table's multi-company array (accumulates, no duplicates)
  if (companyName) {
    await addCompanyToTable(tableId, companyName);
  }

  return { count: guestIds.length };
}

export async function bulkInsertGuests(guestList: InsertGuest[]) {
  const db = await getDb();
  if (!db || guestList.length === 0) return 0;
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < guestList.length; i += batchSize) {
    const batch = guestList.slice(i, i + batchSize);
    await db.insert(guests).values(batch);
    inserted += batch.length;
  }
  return inserted;
}

export async function getSeatingReport(eventId: number) {
  const db = await getDb();
  if (!db) return { tables: [], unassigned: [] };
  const allTables = await db.select().from(tables).where(eq(tables.eventId, eventId));
  const allGuests = await db.select().from(guests).where(eq(guests.eventId, eventId));
  const guestsByTable = new Map<number, typeof allGuests>();
  const unassigned: typeof allGuests = [];
  for (const g of allGuests) {
    if (g.tableId == null) { unassigned.push(g); continue; }
    if (!guestsByTable.has(g.tableId)) guestsByTable.set(g.tableId, []);
    guestsByTable.get(g.tableId)!.push(g);
  }
  return {
    tables: allTables.map((t) => ({ ...t, guests: guestsByTable.get(t.id) ?? [] })),
    unassigned,
  };
}

/**
 * Returns a per-company summary for the report page.
 * Each entry lists: company name, tables assigned, guest count, total capacity.
 */
export async function getCompanyReport(eventId: number): Promise<Array<{
  company: string;
  tableNumbers: number[];
  guestCount: number;
  totalCapacity: number;
  guests: Array<{ id: number; name: string; tableNumber: number }>;
}>> {
  const db = await getDb();
  if (!db) return [];

  const allTables = await db.select().from(tables).where(eq(tables.eventId, eventId));
  const allGuests = await db.select().from(guests).where(eq(guests.eventId, eventId));

  // Map tableId → tableNumber + capacity
  const tableMap = new Map<number, { tableNumber: number; capacity: number; companyName: string | null; companyNames: string | null }>();
  for (const t of allTables) tableMap.set(t.id, { tableNumber: t.tableNumber, capacity: t.capacity, companyName: t.companyName, companyNames: t.companyNames });

  // Group guests by company (from guest.company field)
  const byCompany = new Map<string, { tableIds: Set<number>; guests: Array<{ id: number; name: string; tableNumber: number }> }>();

  for (const g of allGuests) {
    if (g.tableId == null) continue; // skip unassigned
    const companyKey = g.company?.trim() || "— Sem empresa —";
    if (!byCompany.has(companyKey)) byCompany.set(companyKey, { tableIds: new Set(), guests: [] });
    const entry = byCompany.get(companyKey)!;
    entry.tableIds.add(g.tableId);
    const tInfo = tableMap.get(g.tableId);
    entry.guests.push({ id: g.id, name: g.name, tableNumber: tInfo?.tableNumber ?? 0 });
  }

  // Build result sorted alphabetically
  return Array.from(byCompany.entries())
    .map(([company, { tableIds, guests: gList }]) => {
      const tableNumbers = Array.from(tableIds)
        .map((tid) => tableMap.get(tid)?.tableNumber ?? 0)
        .sort((a, b) => a - b);
      const totalCapacity = Array.from(tableIds).reduce((sum, tid) => sum + (tableMap.get(tid)?.capacity ?? 0), 0);
      return { company, tableNumbers, guestCount: gList.length, totalCapacity, guests: gList.sort((a, b) => a.name.localeCompare(b.name)) };
    })
    .sort((a, b) => {
      if (a.company === "— Sem empresa —") return 1;
      if (b.company === "— Sem empresa —") return -1;
      return a.company.localeCompare(b.company);
    });
}
