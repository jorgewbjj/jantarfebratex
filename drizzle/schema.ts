import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Events table — one event per seating arrangement
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// Tables (mesas) — 70 tables per the DON CONCEPT layout
export const tables = mysqlTable("tables", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  tableNumber: int("tableNumber").notNull(), // 1-70
  /**
   * Legacy single-company field — kept for backward compatibility.
   * Derived from companyNames[0] on write; used as fallback on read.
   */
  companyName: varchar("companyName", { length: 255 }),
  /**
   * JSON-encoded string array of company names sharing this table.
   * e.g. '["Empresa A","Empresa B"]'
   * When null/empty, fall back to companyName for backward compat.
   */
  companyNames: text("companyNames"),
  capacity: int("capacity").default(10).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

// Guests (convidados)
export const guests = mysqlTable("guests", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  tableId: int("tableId"), // null = unassigned
  seatNumber: int("seatNumber"), // optional seat within table
  notes: text("notes"),
  confirmed: boolean("confirmed").default(false).notNull(),
  importBatch: varchar("importBatch", { length: 64 }), // track which import batch
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = typeof guests.$inferInsert;
