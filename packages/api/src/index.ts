import { ORPCError, os } from "@orpc/server";
import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import type { Context } from "./context";
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
  if (!context.siteId) {
    throw new ORPCError("BAD_REQUEST", { message: "Site not resolved" });
  }
  const site = await db.query.sites.findFirst({
    where: eq(sites.id, context.siteId),
    columns: { id: true, isActive: true, accessPassword: true },
  });
  if (!site) {
    throw new ORPCError("NOT_FOUND", { message: "Site not found" });
  }
  if (!site.isActive) {
    throw new ORPCError("FORBIDDEN", { message: "SITE_INACTIVE" });
  }
  if (!isSiteUnlockValid(context.cookieHeader, site.id, site.accessPassword)) {
    throw new ORPCError("FORBIDDEN", { message: "SITE_LOCKED" });
  }
  return next({ context: { siteId: site.id } });
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
