import type { Context as HonoContext } from "hono";
import { auth } from "@zhk/auth";
import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { eq } from "drizzle-orm";

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
  const hostname = host.split(":")[0] ?? "";
  if (hostname) {
    const byDomain = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.customDomain, hostname))
      .limit(1);
    if (byDomain[0]) return byDomain[0].id;

    const parts = hostname.split(".");
    const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
    const sub = parts.length > (isLocalhost ? 1 : 2) ? parts[0] : null;
    if (sub) {
      const bySlug = await db
        .select({ id: sites.id })
        .from(sites)
        .where(eq(sites.slug, sub))
        .limit(1);
      if (bySlug[0]) return bySlug[0].id;
    }
  }

  const primary = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.isPrimary, true))
    .limit(1);
  return primary[0]?.id ?? null;
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const siteId = await resolveSiteId(context);

  return { session, siteId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
