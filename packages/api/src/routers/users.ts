import { z } from "zod";
import { db } from "@zhk/db";
import { user } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { adminProcedure, protectedProcedure } from "../index";

const permissionsSchema = z.object({
  siteIds: z.array(z.string()).optional(),
  sections: z.array(z.string()).optional(),
  actions: z.array(z.enum(["view", "edit", "publish"])).optional(),
});

export const usersRouter = {
  me: protectedProcedure.handler(async ({ context }) => {
    const row = await db.query.user.findFirst({
      where: eq(user.id, context.session!.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
      },
    });
    return row ?? null;
  }),

  list: adminProcedure.handler(async () => {
    return db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        banned: true,
        createdAt: true,
      },
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    });
  }),

  updateRole: adminProcedure
    .input(z.object({ id: z.string(), role: z.enum(["admin", "editor"]) }))
    .handler(async ({ input, context }) => {
      if (input.id === context.session!.user.id && input.role !== "admin") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot demote yourself",
        });
      }
      const [updated] = await db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  updatePermissions: adminProcedure
    .input(z.object({ id: z.string(), permissions: permissionsSchema }))
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(user)
        .set({ permissions: input.permissions })
        .where(eq(user.id, input.id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),
};
