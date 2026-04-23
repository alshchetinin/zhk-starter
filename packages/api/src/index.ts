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

export const protectedProcedure = publicProcedure.use(requireAuth);
export const siteProcedure = protectedProcedure.use(requireSite);
export const publicSiteProcedure = publicProcedure.use(requireSite);
