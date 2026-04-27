import type { Context as HonoContext } from "hono";
import { auth } from "@zhk/auth";
import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { resolveSiteFromHost } from "./utils/resolve-site";

export type CreateContextOptions = {
  context: HonoContext;
};

async function resolveSiteId(context: HonoContext): Promise<string | null> {
  const headerSiteId = context.req.header("x-site-id");
  if (headerSiteId) return headerSiteId;

  const headerSlug = context.req.header("x-site-slug");
  if (headerSlug) {
    const row = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.slug, headerSlug))
      .limit(1);
    if (row[0]) return row[0].id;
  }

  const host = context.req.header("x-forwarded-host") ?? context.req.header("host") ?? "";
  const site = await resolveSiteFromHost(host);
  return site?.id ?? null;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const siteId = await resolveSiteId(context);
  const cookieHeader = context.req.header("cookie") ?? "";
  const responseHeaders = new Headers();

  return { session, siteId, cookieHeader, responseHeaders };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
