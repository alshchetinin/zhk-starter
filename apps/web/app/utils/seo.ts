import type { PublicSiteSeo } from "@zhk/api/shared/seo";

export interface PageMetaInput {
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  type?: "website" | "article";
}

export interface PageMetaContext {
  seo: PublicSiteSeo | null;
  siteName: string;
  origin: string;
  path: string;
}

export interface ResolvedPageMeta {
  title: string;
  description: string | null;
  canonical: string;
  ogImage: string | null;
  ogType: "website" | "article";
  siteName: string;
  robots: string | null;
}

export function absolutizeUrl(
  url: string | null | undefined,
  origin: string,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return `${origin}/${trimmed}`;
}

export function canonicalUrl(origin: string, path: string): string {
  const clean = path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
  return `${origin}${clean}`;
}

export function resolvePageMeta(
  page: PageMetaInput,
  ctx: PageMetaContext,
): ResolvedPageMeta {
  const seo = ctx.seo;
  const baseTitle = page.title?.trim() || seo?.defaultTitle || ctx.siteName;
  const title = seo?.titleSuffix ? `${baseTitle} ${seo.titleSuffix}`.trim() : baseTitle;

  return {
    title,
    description: page.description?.trim() || seo?.defaultDescription || null,
    canonical: canonicalUrl(ctx.origin, ctx.path),
    ogImage: absolutizeUrl(page.ogImage || seo?.defaultOgImage, ctx.origin),
    ogType: page.type ?? "website",
    siteName: ctx.siteName,
    robots: seo && !seo.indexable ? "noindex, nofollow" : null,
  };
}
