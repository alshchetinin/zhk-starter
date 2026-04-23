import { z } from "zod";
import { db } from "@zhk/db";
import { contentVersions } from "@zhk/db/schema";
import { and, desc, eq, max } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { ENTITY_TYPES, type EntityType } from "../shared/constants";

export { ENTITY_TYPES };
export type { EntityType };

export async function snapshotContent(options: {
  siteId: string;
  entityType: EntityType;
  entityId: string;
  snapshot: unknown;
  createdById: string | null;
  note?: string | null;
}) {
  const current = await db
    .select({ v: max(contentVersions.version) })
    .from(contentVersions)
    .where(
      and(
        eq(contentVersions.entityType, options.entityType),
        eq(contentVersions.entityId, options.entityId),
        eq(contentVersions.siteId, options.siteId),
      ),
    );
  const version = (current[0]?.v ?? 0) + 1;
  const [created] = await db
    .insert(contentVersions)
    .values({
      siteId: options.siteId,
      entityType: options.entityType,
      entityId: options.entityId,
      version,
      snapshot: options.snapshot as Record<string, unknown>,
      createdById: options.createdById,
      note: options.note ?? null,
    })
    .returning();
  return created!;
}

export const versionsRouter = {
  list: siteProcedure
    .input(
      z.object({
        entityType: z.enum(ENTITY_TYPES),
        entityId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      return db.query.contentVersions.findMany({
        where: and(
          eq(contentVersions.siteId, context.siteId),
          eq(contentVersions.entityType, input.entityType),
          eq(contentVersions.entityId, input.entityId),
        ),
        with: { createdBy: { columns: { id: true, name: true, email: true } } },
        orderBy: [desc(contentVersions.version)],
        limit: 50,
      });
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const v = await db.query.contentVersions.findFirst({
        where: and(eq(contentVersions.id, input.id), eq(contentVersions.siteId, context.siteId)),
        with: { createdBy: { columns: { id: true, name: true, email: true } } },
      });
      if (!v) throw new ORPCError("NOT_FOUND");
      return v;
    }),

  create: siteProcedure
    .input(
      z.object({
        entityType: z.enum(ENTITY_TYPES),
        entityId: z.string(),
        snapshot: z.unknown(),
        note: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return snapshotContent({
        siteId: context.siteId,
        entityType: input.entityType,
        entityId: input.entityId,
        snapshot: input.snapshot,
        createdById: context.session.user.id,
        note: input.note ?? null,
      });
    }),
};
