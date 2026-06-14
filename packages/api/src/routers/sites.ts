import { z } from "zod";
import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { adminProcedure, protectedProcedure } from "../index";
import { duplicateSite } from "../services/site-duplication";
import { resolveSiteFromHost } from "../utils/resolve-site";
import { METRIKA_COUNTER_ID_REGEX } from "../shared/tracking";

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Invalid slug");

const yandexMetrikaSchema = z.object({
  counterId: z.string().regex(METRIKA_COUNTER_ID_REGEX, "ID счётчика — только цифры"),
  webvisor: z.boolean().optional(),
  clickmap: z.boolean().optional(),
  trackLinks: z.boolean().optional(),
  accurateTrackBounce: z.boolean().optional(),
  ecommerce: z.boolean().optional(),
});

const analyticsSchema = z
  .object({
    yandexMetrika: yandexMetrikaSchema.nullish(),
  })
  .partial();

const seoOrganizationSchema = z
  .object({
    name: z.string().optional(),
    legalName: z.string().optional(),
    logo: z.string().optional(),
    contactId: z.string().optional(),
  })
  .partial();

const seoSchema = z
  .object({
    titleSuffix: z.string().optional(),
    defaultTitle: z.string().optional(),
    defaultDescription: z.string().optional(),
    defaultOgImage: z.string().optional(),
    favicon: z.string().optional(),
    indexingEnabled: z.boolean().optional(),
    yandexVerification: z.string().optional(),
    googleVerification: z.string().optional(),
    organization: seoOrganizationSchema.optional(),
  })
  .partial();

const settingsSchema = z
  .object({
    contactsHeaderIds: z.array(z.string()).optional(),
    contactsFooterIds: z.array(z.string()).optional(),
    analytics: analyticsSchema.optional(),
    seo: seoSchema.optional(),
  })
  .partial();

export const sitesRouter = {
  list: protectedProcedure.handler(async () => {
    return db.query.sites.findMany({
      orderBy: (s, { desc, asc }) => [desc(s.isPrimary), asc(s.name)],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const site = await db.query.sites.findFirst({
        where: eq(sites.id, input.id),
      });
      if (!site) throw new ORPCError("NOT_FOUND", { message: "Site not found" });
      return site;
    }),

  create: adminProcedure
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().min(1),
        cityId: z.string().nullable().optional(),
        customDomain: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db
        .select({ id: sites.id })
        .from(sites)
        .where(eq(sites.slug, input.slug))
        .limit(1);
      if (existing[0]) {
        throw new ORPCError("CONFLICT", { message: "Slug already in use" });
      }
      const [created] = await db
        .insert(sites)
        .values({
          slug: input.slug,
          name: input.name,
          cityId: input.cityId ?? null,
          customDomain: input.customDomain ?? null,
          isPrimary: false,
          isActive: false,
        })
        .returning();
      return created;
    }),

  duplicate: adminProcedure
    .input(
      z.object({
        sourceSiteId: z.string(),
        name: z.string().min(1),
        slug: z.string().min(1),
        cityId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const slugTaken = await db.query.sites.findFirst({
        where: eq(sites.slug, input.slug),
        columns: { id: true },
      });
      if (slugTaken) {
        throw new ORPCError("CONFLICT", { message: "Сайт с таким slug уже существует" });
      }
      return db.transaction((tx) => duplicateSite(tx, input));
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        slug: slugSchema.optional(),
        name: z.string().min(1).optional(),
        cityId: z.string().nullable().optional(),
        customDomain: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        accessPassword: z.string().nullable().optional(),
        settings: settingsSchema.optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, settings, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (settings !== undefined) {
        const existing = await db.query.sites.findFirst({ where: eq(sites.id, id) });
        if (!existing) throw new ORPCError("NOT_FOUND");
        updates.settings = { ...(existing.settings ?? {}), ...settings };
      }
      if (Object.keys(updates).length === 0) {
        const existing = await db.query.sites.findFirst({ where: eq(sites.id, id) });
        if (!existing) throw new ORPCError("NOT_FOUND");
        return existing;
      }
      if (updates.slug) {
        const conflict = await db
          .select({ id: sites.id })
          .from(sites)
          .where(and(eq(sites.slug, updates.slug as string), ne(sites.id, id)))
          .limit(1);
        if (conflict[0]) {
          throw new ORPCError("CONFLICT", { message: "Slug already in use" });
        }
      }
      const [updated] = await db
        .update(sites)
        .set(updates)
        .where(eq(sites.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  makePrimary: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.update(sites).set({ isPrimary: false }).where(eq(sites.isPrimary, true));
        await tx.update(sites).set({ isPrimary: true }).where(eq(sites.id, input.id));
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const site = await db.query.sites.findFirst({ where: eq(sites.id, input.id) });
      if (!site) throw new ORPCError("NOT_FOUND");
      if (site.isPrimary) {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot delete primary site" });
      }
      await db.delete(sites).where(eq(sites.id, input.id));
      return { success: true };
    }),

  resolveByHost: protectedProcedure
    .input(z.object({ host: z.string() }))
    .handler(async ({ input }) => {
      return (await resolveSiteFromHost(input.host)) ?? null;
    }),
};
