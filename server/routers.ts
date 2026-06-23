import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addGuest,
  assignGuestToTable,
  bulkInsertGuests,
  deleteGuest,
  getDefaultEvent,
  getGuestsForEvent,
  getGuestsForTable,
  getSeatingReport,
  getTablesForEvent,
  getUnassignedGuests,
  ensureTablesExist,
  updateGuest,
  updateTableCapacity,
  updateTableCompany,
  updateTableNotes,
} from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Event ────────────────────────────────────────────────────────────────
  event: router({
    getDefault: publicProcedure.query(async () => {
      const event = await getDefaultEvent();
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "No event found" });
      return event;
    }),
  }),

  // ─── Tables ───────────────────────────────────────────────────────────────
  tables: router({
    list: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        await ensureTablesExist(input.eventId);
        return getTablesForEvent(input.eventId);
      }),

    updateCompany: publicProcedure
      .input(z.object({ tableId: z.number(), companyName: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await updateTableCompany(input.tableId, input.companyName);
        return { success: true };
      }),

    updateNotes: publicProcedure
      .input(z.object({ tableId: z.number(), notes: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await updateTableNotes(input.tableId, input.notes);
        return { success: true };
      }),

    updateCapacity: publicProcedure
      .input(z.object({ tableId: z.number(), capacity: z.number().min(1).max(30) }))
      .mutation(async ({ input }) => {
        await updateTableCapacity(input.tableId, input.capacity);
        return { success: true };
      }),

    getGuests: publicProcedure
      .input(z.object({ tableId: z.number() }))
      .query(async ({ input }) => {
        return getGuestsForTable(input.tableId);
      }),
  }),

  // ─── Guests ───────────────────────────────────────────────────────────────
  guests: router({
    list: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return getGuestsForEvent(input.eventId);
      }),

    unassigned: publicProcedure
      .input(z.object({ eventId: z.number(), search: z.string().optional() }))
      .query(async ({ input }) => {
        return getUnassignedGuests(input.eventId, input.search);
      }),

    add: publicProcedure
      .input(
        z.object({
          eventId: z.number(),
          name: z.string().min(1),
          company: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          tableId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const guest = await addGuest({
          eventId: input.eventId,
          name: input.name,
          company: input.company ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          tableId: input.tableId ?? null,
          notes: input.notes ?? null,
        });
        if (!guest) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add guest" });
        return guest;
      }),

    update: publicProcedure
      .input(
        z.object({
          guestId: z.number(),
          name: z.string().min(1).optional(),
          company: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          confirmed: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { guestId, ...data } = input;
        await updateGuest(guestId, data);
        return { success: true };
      }),

    assign: publicProcedure
      .input(z.object({ guestId: z.number(), tableId: z.number().nullable() }))
      .mutation(async ({ input }) => {
        await assignGuestToTable(input.guestId, input.tableId);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ guestId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGuest(input.guestId);
        return { success: true };
      }),

    bulkImport: publicProcedure
      .input(
        z.object({
          eventId: z.number(),
          guests: z.array(
            z.object({
              name: z.string().min(1),
              company: z.string().optional(),
              email: z.string().optional(),
              phone: z.string().optional(),
            })
          ),
          importBatch: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const guestList = input.guests.map((g) => ({
          eventId: input.eventId,
          name: g.name,
          company: g.company ?? null,
          email: g.email ?? null,
          phone: g.phone ?? null,
          tableId: null as number | null,
          importBatch: input.importBatch,
        }));
        const count = await bulkInsertGuests(guestList);
        return { success: true, count };
      }),
  }),

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: router({
    seating: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return getSeatingReport(input.eventId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
