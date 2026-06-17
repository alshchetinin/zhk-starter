import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Резолв сайта по Host-заголовку.
 *
 * Возвращает `null`, если хост явно адресует конкретный сайт, которого нет
 * среди активных (архивный/удалённый/несуществующий поддомен, либо домен
 * архивного сайта) — веб по `null` отдаёт 404 «Сайт не найден», а не главный.
 *
 * Главный сайт отдаётся по умолчанию только для «дефолтных» хостов: апекс,
 * `www`, голый `localhost`, пустой хост, а также по своему customDomain.
 */
export async function resolveSiteFromHost(host: string | null | undefined) {
  const hostname = (host ?? "").split(":")[0] ?? "";
  if (!hostname) return findPrimarySite();

  const parts = hostname.split(".");
  const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
  const subdomain = parts.length > (isLocalhost ? 1 : 2) ? parts[0] : null;

  // 1. Совпадение по customDomain (любого состояния): активный → отдаём;
  //    архивный → сайт по этому домену «больше не существует» → null.
  const byDomain = await db.query.sites.findFirst({
    where: eq(sites.customDomain, hostname),
  });
  if (byDomain) return byDomain.archivedAt ? null : byDomain;

  // 2. Реальный поддомен (кроме www): активный slug → отдаём; иначе not found.
  if (subdomain && subdomain !== "www") {
    const bySlug = await db.query.sites.findFirst({
      where: and(isNull(sites.archivedAt), eq(sites.slug, subdomain)),
    });
    return bySlug ?? null;
  }

  // 3. Апекс / www / голый localhost / пустой хост → главный сайт по умолчанию.
  return findPrimarySite();
}

function findPrimarySite() {
  return db.query.sites.findFirst({
    where: and(eq(sites.isPrimary, true), isNull(sites.archivedAt)),
  });
}
