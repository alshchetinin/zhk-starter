import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * Resolve a site by host header:
 * 1. customDomain match → that site
 * 2. leading subdomain → site with matching slug (skip when host is bare `localhost` or apex domain with ≤2 parts)
 * 3. fallback → primary site
 */
export async function resolveSiteFromHost(host: string | null | undefined) {
  const hostname = (host ?? "").split(":")[0] ?? "";
  if (!hostname) return findPrimarySite();

  const parts = hostname.split(".");
  const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
  const subdomain = parts.length > (isLocalhost ? 1 : 2) ? parts[0] : null;

  const match = await db.query.sites.findFirst({
    where: or(
      eq(sites.customDomain, hostname),
      subdomain ? eq(sites.slug, subdomain) : undefined,
    ),
  });
  if (match) return match;

  return findPrimarySite();
}

function findPrimarySite() {
  return db.query.sites.findFirst({ where: eq(sites.isPrimary, true) });
}
