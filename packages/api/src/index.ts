import { ORPCError } from "@orpc/server";
import { SITE_GATE_ERROR } from "./utils/site-gate-errors";
import { isSiteUnlockValid, isUnlockTokenValid } from "./utils/site-unlock";
import { o, publicProcedure } from "./orpc-base";
import { rateLimit } from "./middleware/rate-limit";
export { o, publicProcedure } from "./orpc-base";

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
  // Анлок принимаем из куки (SSR форвардит) ИЛИ из заголовка x-site-unlock
  // (клиентский кросс-доменный запрос — куку не несёт).
  const unlocked =
    isSiteUnlockValid(context.cookieHeader, site.id, site.accessPassword) ||
    isUnlockTokenValid(context.siteUnlockToken, site.id, site.accessPassword);
  if (!unlocked) {
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

export const publicReadProcedure = publicActiveSiteProcedure.use(
  rateLimit("publicRead", { keyBy: "ip" }),
);
