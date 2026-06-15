import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum, formDeliveries } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { processTicketDeliveries } from "../services/receivers";

export const ticketsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        type: z.enum(ticketTypeEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, type, search } = input;
      const conditions = [];
      if (type) conditions.push(eq(tickets.type, type));
      if (search) conditions.push(ilike(tickets.phone, `%${search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.tickets.findMany({
          where,
          with: { apartment: { columns: { id: true } } },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (t, { desc: d }) => [d(t.createdAt)],
        }),
        db.select({ total: count() }).from(tickets).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: {
          apartment: { columns: { id: true } },
          deliveries: { orderBy: (d, { asc }) => [asc(d.createdAt)] },
        },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      }
      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(tickets)
        .where(eq(tickets.id, input.id))
        .returning({ id: tickets.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      }
      return { success: true };
    }),

  retryDelivery: protectedProcedure
    .input(z.object({ ticketId: z.string(), deliveryId: z.string().optional() }))
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
        columns: { id: true },
      });
      if (!ticket) throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      await processTicketDeliveries(
        input.ticketId,
        input.deliveryId ? [input.deliveryId] : undefined,
      );
      const deliveries = await db.query.formDeliveries.findMany({
        where: eq(formDeliveries.ticketId, input.ticketId),
        orderBy: (d, { asc }) => [asc(d.createdAt)],
      });
      return { deliveries };
    }),
};
