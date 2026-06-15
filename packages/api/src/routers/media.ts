import { z } from "zod";
import { db } from "@zhk/db";
import { media } from "@zhk/db/schema";
import { and, count, eq, like, ilike, isNotNull, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { rateLimit } from "../middleware/rate-limit";
import { paginationInput, calcOffset } from "../shared/pagination";
import { deleteS3Object } from "../s3";

export const mediaRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        folder: z.string().optional(),
        search: z.string().optional(),
        contentType: z.enum(["image"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, folder, search, contentType } = input;
      const conditions = [];
      if (folder) conditions.push(eq(media.folder, folder));
      if (search) conditions.push(ilike(media.fileName, `%${search}%`));
      if (contentType)
        conditions.push(like(media.contentType, `${contentType}/%`));
      const where = conditions.length ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.media.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (m, { desc }) => [desc(m.createdAt)],
        }),
        db.select({ total: count() }).from(media).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  update: protectedProcedure
    .input(z.object({ url: z.string().url(), alt: z.string().max(500) }))
    .handler(async ({ input }) => {
      // url де-факто уникален (key содержит uuid). Пустой alt → null.
      await db
        .update(media)
        .set({ alt: input.alt.trim() || null })
        .where(eq(media.url, input.url));
      return { success: true };
    }),

  altMap: publicProcedure
    .use(rateLimit("publicRead", { keyBy: "ip" }))
    .handler(async () => {
      const rows = await db
        .select({ url: media.url, alt: media.alt })
        .from(media)
        .where(and(isNotNull(media.alt), ne(media.alt, "")));
      const map: Record<string, string> = {};
      for (const r of rows) if (r.alt) map[r.url] = r.alt;
      return map;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.media.findFirst({
        where: eq(media.id, input.id),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Media not found" });
      }
      try {
        await deleteS3Object(item.key);
      } catch (err) {
        console.error("[media] S3 delete failed:", item.key, err);
      }
      await db.delete(media).where(eq(media.id, input.id));
      return { success: true };
    }),
};
