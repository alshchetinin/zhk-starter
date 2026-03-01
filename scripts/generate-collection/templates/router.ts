import type { CollectionNames } from "../utils.js";
import type { FieldInfo } from "../prompts.js";
import { COLLECTION_FIELD_TYPES } from "../field-types.js";

export function generateRouterTemplate(
  names: CollectionNames,
  fields: FieldInfo[],
): string {
  const hasDynamicBlocks = fields.some((f) => f.type === "dynamic-blocks");

  const blocksImport = hasDynamicBlocks
    ? `\nimport { contentBlocksSchema } from "../shared/blocks";`
    : "";

  // Generate zod fields for create
  const createFields = fields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type];
      if (!ft) return `        // ${f.name}: unknown type`;
      return `        ${f.name}: ${ft.zodCreateType(f.required)},`;
    })
    .join("\n");

  // Generate zod fields for update (always optional)
  const updateFields = fields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type];
      if (!ft) return `        // ${f.name}: unknown type`;
      return `        ${f.name}: ${ft.zodUpdateType},`;
    })
    .join("\n");

  // Generate create values mapping
  const createValues = fields
    .map((f) => {
      if (!f.required && (f.type === "string" || f.type === "textarea" || f.type === "image")) {
        return `          ${f.name}: input.${f.name} ?? null,`;
      }
      return `          ${f.name}: input.${f.name},`;
    })
    .join("\n");

  return `import { z } from "zod";
import { db } from "@zhk/db";
import { ${names.camel} } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";${blocksImport}

export const ${names.routerVar} = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, search } = input;
      const conditions = [];
      if (search) conditions.push(ilike(${names.camel}.title, \`%\${search}%\`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.${names.camel}.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        }),
        db.select({ total: count() }).from(${names.camel}).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.${names.camel}.findFirst({
        where: eq(${names.camel}.id, input.id),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "${names.singularLabel} not found" });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
${createFields}
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(${names.camel})
        .values({
          title: input.title,
${createValues}
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
${updateFields}
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.${names.camel}.findFirst({
          where: eq(${names.camel}.id, id),
        });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "${names.singularLabel} not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(${names.camel})
        .set(updates)
        .where(eq(${names.camel}.id, id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "${names.singularLabel} not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(${names.camel})
        .where(eq(${names.camel}.id, input.id))
        .returning({ id: ${names.camel}.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "${names.singularLabel} not found" });
      }
      return { success: true };
    }),
};
`;
}
