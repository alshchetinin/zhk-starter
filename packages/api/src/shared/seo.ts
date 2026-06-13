/**
 * SEO-типы и логика индексируемости, общие для API, web и админки.
 *
 * Хранимая форма настроек (`SiteSeoSettings`) живёт в packages/db/src/schema/sites.ts
 * (JSONB сайта). Здесь — производный публичный payload (`PublicSiteSeo`),
 * который `publicSite.status` отдаёт web-приложению.
 */

export interface SiteIndexabilityInput {
  isActive: boolean;
  accessPassword: string | null;
  indexingEnabled?: boolean;
}

/**
 * Сайт открыт для поисковиков, только если он активен, не закрыт паролем
 * и индексация не выключена явно. indexingEnabled === undefined → включена.
 */
export function isSiteIndexable(input: SiteIndexabilityInput): boolean {
  return input.isActive && !input.accessPassword && input.indexingEnabled !== false;
}

export interface PublicSiteSeoOrganization {
  name: string;
  legalName: string | null;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface PublicSiteSeo {
  titleSuffix: string | null;
  defaultTitle: string | null;
  defaultDescription: string | null;
  defaultOgImage: string | null;
  favicon: string | null;
  indexable: boolean;
  yandexVerification: string | null;
  googleVerification: string | null;
  organization: PublicSiteSeoOrganization;
}
