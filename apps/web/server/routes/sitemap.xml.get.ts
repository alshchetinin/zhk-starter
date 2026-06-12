import type { SitemapEntry, SitemapPayload } from "../utils/seo";

const STATIC_PATHS = ["/", "/projects", "/news", "/promotions", "/documents"];

export default defineEventHandler(async (event) => {
  const data = await callPublicRpc<SitemapPayload>(event, "site/sitemap");
  const origin = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true,
  }).origin;

  const entries: SitemapEntry[] = [];
  if (data?.indexable) {
    for (const path of STATIC_PATHS) {
      entries.push({ loc: path === "/" ? `${origin}/` : `${origin}${path}` });
    }
    for (const n of data.news) {
      entries.push({ loc: `${origin}/news/${n.slug}`, lastmod: n.updatedAt });
    }
    for (const p of data.pages) {
      entries.push({ loc: `${origin}/${p.slug}`, lastmod: p.updatedAt });
    }
    for (const p of data.projects) {
      entries.push({ loc: `${origin}/projects/${p.id}`, lastmod: p.updatedAt });
    }
  }

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return buildSitemapXml(entries);
});
