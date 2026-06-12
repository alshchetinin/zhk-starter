import type { Context as HonoContext } from "hono";
import { auth } from "@zhk/auth";
import { db } from "@zhk/db";
import { getClientIp } from "@zhk/ratelimit";
import { sites } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { resolveSiteFromHost } from "./utils/resolve-site";

export type CreateContextOptions = {
  context: HonoContext;
};

type ResolvedSite = typeof sites.$inferSelect;

async function resolveSite(context: HonoContext): Promise<ResolvedSite | null> {
  const headerSiteId = context.req.header("x-site-id");
  if (headerSiteId) {
    return (
      (await db.query.sites.findFirst({ where: eq(sites.id, headerSiteId) })) ?? null
    );
  }

  const headerSlug = context.req.header("x-site-slug");
  if (headerSlug) {
    const match = await db.query.sites.findFirst({
      where: eq(sites.slug, headerSlug),
    });
    if (match) return match;
  }

  const host = context.req.header("x-forwarded-host") ?? context.req.header("host") ?? "";
  return (await resolveSiteFromHost(host)) ?? null;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const site = await resolveSite(context);
  const cookieHeader = context.req.header("cookie") ?? "";
  const clientIp = getClientIp(context.req.raw.headers);
  const responseHeaders = new Headers();

  return {
    session,
    siteId: site?.id ?? null,
    site,
    cookieHeader,
    clientIp,
    responseHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
