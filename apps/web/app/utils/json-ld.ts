/** Билдеры schema.org JSON-LD. Чистые функции: пустые поля опускаются. */

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === null || v === undefined || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  ) as T;
}

export interface OrganizationJsonLdInput {
  name: string;
  url: string;
  legalName?: string | null;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  sameAs?: string[];
}

export function buildOrganizationJsonLd(input: OrganizationJsonLdInput) {
  if (!input.name) return null;
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    legalName: input.legalName ?? undefined,
    logo: input.logo ?? undefined,
    telephone: input.phone ?? undefined,
    email: input.email ?? undefined,
    address: input.address
      ? { "@type": "PostalAddress", streetAddress: input.address }
      : undefined,
    sameAs: input.sameAs?.length ? input.sameAs : undefined,
  });
}

export function buildWebSiteJsonLd(input: { name: string; url: string }) {
  if (!input.name) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
}

export interface NewsArticleJsonLdInput {
  headline: string;
  url: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  publisherName?: string | null;
  publisherLogo?: string | null;
}

export function buildNewsArticleJsonLd(input: NewsArticleJsonLdInput) {
  if (!input.headline) return null;
  return compact({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    url: input.url,
    description: input.description ?? undefined,
    image: input.image ? [input.image] : undefined,
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? undefined,
    publisher: input.publisherName
      ? compact({
          "@type": "Organization",
          name: input.publisherName,
          logo: input.publisherLogo ?? undefined,
        })
      : undefined,
  });
}

export function parseCoordinates(
  raw: string | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { latitude: parts[0]!, longitude: parts[1]! };
}

export interface ApartmentComplexJsonLdInput {
  name: string;
  url: string;
  address?: string | null;
  coordinates?: string | null;
  images?: (string | null | undefined)[];
}

export function buildApartmentComplexJsonLd(input: ApartmentComplexJsonLdInput) {
  if (!input.name) return null;
  const geo = parseCoordinates(input.coordinates);
  const images = (input.images ?? []).filter((i): i is string => !!i);
  return compact({
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    name: input.name,
    url: input.url,
    address: input.address
      ? { "@type": "PostalAddress", streetAddress: input.address }
      : undefined,
    geo: geo
      ? { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude }
      : undefined,
    image: images.length ? images : undefined,
  });
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
