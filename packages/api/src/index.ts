import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({ context: { session: context.session } });
});

const requireSite = o.middleware(async ({ context, next }) => {
  if (!context.siteId) {
    throw new ORPCError("BAD_REQUEST", { message: "Site not resolved" });
  }
  return next({ context: { siteId: context.siteId } });
});

const requireAdmin = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if ((context.session.user as { role?: string }).role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin role required" });
  }
  return next({ context: { session: context.session } });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const siteProcedure = protectedProcedure.use(requireSite);
export const adminProcedure = publicProcedure.use(requireAdmin);
export const publicSiteProcedure = publicProcedure.use(requireSite);
