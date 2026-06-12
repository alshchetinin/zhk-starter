/** Чистые билдеры sitemap.xml и robots.txt (без h3/nitro-зависимостей). */

export interface SitemapEntry {
  loc: string;
  lastmod?: string | null;
}

/** Ответ publicSite.sitemap (даты сериализуются в ISO-строки). */
export interface SitemapPayload {
  indexable: boolean;
  news: { slug: string; updatedAt: string }[];
  pages: { slug: string; updatedAt: string }[];
  projects: { id: string; updatedAt: string }[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : "";
      return `<url><loc>${escapeXml(e.loc)}</loc>${lastmod}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function buildRobotsTxt(opts: { indexable: boolean; sitemapUrl: string }): string {
  if (!opts.indexable) {
    return "User-agent: *\nDisallow: /\n";
  }
  return `User-agent: *\nDisallow: /_preview\n\nSitemap: ${opts.sitemapUrl}\n`;
}
