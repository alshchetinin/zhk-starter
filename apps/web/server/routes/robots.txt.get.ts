import type { SitemapPayload } from "../utils/seo";

export default defineEventHandler(async (event) => {
  const data = await callPublicRpc<SitemapPayload>(event, "site/sitemap");
  const origin = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true,
  }).origin;

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return buildRobotsTxt({
    indexable: data?.indexable ?? false,
    sitemapUrl: `${origin}/sitemap.xml`,
  });
});
