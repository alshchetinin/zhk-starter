import { z } from "zod";
import { db } from "@zhk/db";
import { contacts, SOCIAL_LINK_TYPES } from "@zhk/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, siteProcedure } from "../index";

const socialSchema = z.object({
  link: z.string().min(1),
  type: z.enum(SOCIAL_LINK_TYPES),
});

const baseFields = {
  label: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal("")]).nullable().optional(),
  address: z.string().nullable().optional(),
  workingHours: z.string().nullable().optional(),
  coordinates: z.string().nullable().optional(),
  mapLink: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  image: z.string().nullable().optional(),
  socials: z.array(socialSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  sortOrder: z.number().int().default(0),
};

function normalizeInput(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value === "") {
      out[key] = null;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const contactsRouter = {
  list: siteProcedure
    .input(
      z
        .object({
          tag: z.string().optional(),
        })
        .optional(),
    )
    .handler(async ({ input, context }) => {
      const items = await db.query.contacts.findMany({
        where: eq(contacts.siteId, context.siteId),
        orderBy: [asc(contacts.sortOrder), asc(contacts.label)],
      });
      if (input?.tag) {
        return items.filter((c) => c.tags.includes(input.tag!));
      }
      return items;
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.siteId, context.siteId),
        ),
      });
      if (!item) throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
      return item;
    }),

  create: siteProcedure
    .input(z.object(baseFields))
    .handler(async ({ input, context }) => {
      const data = normalizeInput(input);
      const [created] = await db
        .insert(contacts)
        .values({ siteId: context.siteId, ...data } as typeof contacts.$inferInsert)
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(
      z.object({
        id: z.string(),
        ...Object.fromEntries(
          Object.entries(baseFields).map(([k, v]) => [k, v.optional()]),
        ),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...rest } = input as { id: string } & Record<string, unknown>;
      const updates = normalizeInput(rest);
      const scope = and(
        eq(contacts.id, id),
        eq(contacts.siteId, context.siteId),
      );

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.contacts.findFirst({ where: scope });
        if (!existing) throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
        return existing;
      }

      const [updated] = await db
        .update(contacts)
        .set(updates)
        .where(scope)
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(contacts)
        .where(
          and(
            eq(contacts.id, input.id),
            eq(contacts.siteId, context.siteId),
          ),
        )
        .returning({ id: contacts.id });
      if (!deleted.length)
        throw new ORPCError("NOT_FOUND", { message: "Contact not found" });
      return { success: true };
    }),

  listBySite: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .handler(async ({ input }) => {
      return db.query.contacts.findMany({
        where: eq(contacts.siteId, input.siteId),
        orderBy: [asc(contacts.sortOrder), asc(contacts.label)],
      });
    }),

  getByIds: siteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      if (input.ids.length === 0) return [];
      return db.query.contacts.findMany({
        where: and(
          eq(contacts.siteId, context.siteId),
          inArray(contacts.id, input.ids),
        ),
      });
    }),
};
