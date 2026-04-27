import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";
import { SITE_GATE_ERROR } from "./utils/site-gate-errors";
import { isSiteUnlockValid } from "./utils/site-unlock";

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

const requireActiveSite = o.middleware(async ({ context, next }) => {
  const site = context.site;
  if (!site) {
    throw new ORPCError("BAD_REQUEST", { message: "Site not resolved" });
  }
  if (!site.isActive) {
    throw new ORPCError("FORBIDDEN", { message: SITE_GATE_ERROR.INACTIVE });
  }
  if (!isSiteUnlockValid(context.cookieHeader, site.id, site.accessPassword)) {
    throw new ORPCError("FORBIDDEN", { message: SITE_GATE_ERROR.LOCKED });
  }
  return next({ context: { siteId: site.id, site } });
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

const requireDev = o.middleware(async ({ context, next }) => {
  if (process.env.NODE_ENV === "production") {
    throw new ORPCError("FORBIDDEN", { message: "Dev-only endpoint" });
  }
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
export const publicActiveSiteProcedure = publicSiteProcedure.use(requireActiveSite);
export const devProcedure = publicProcedure.use(requireDev);
