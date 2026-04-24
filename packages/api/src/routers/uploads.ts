import { z } from "zod";
import { db } from "@zhk/db";
import { media } from "@zhk/db/schema";
import { protectedProcedure } from "../index";
import { createPresignedPutUrl, getPublicUrl } from "../s3";

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadsRouter = {
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        contentType: z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ]),
        fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
        folder: z.string().min(1).default("uploads"),
      }),
    )
    .handler(async ({ input }) => {
      const ext = CONTENT_TYPE_TO_EXT[input.contentType];
      const key = `${input.folder}/${crypto.randomUUID()}.${ext}`;
      const presignedUrl = await createPresignedPutUrl(key, input.contentType);
      const publicUrl = getPublicUrl(key);

      await db.insert(media).values({
        url: publicUrl,
        key,
        fileName: input.fileName,
        contentType: input.contentType,
        fileSize: input.fileSize,
        folder: input.folder,
      });

      return { presignedUrl, publicUrl, key };
    }),
};
