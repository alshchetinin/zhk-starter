import { relations } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface YandexMetrikaSettings {
  counterId: string;
  webvisor?: boolean;
  clickmap?: boolean;
  trackLinks?: boolean;
  accurateTrackBounce?: boolean;
  ecommerce?: boolean;
}

export interface SiteAnalyticsSettings {
  yandexMetrika?: YandexMetrikaSettings;
}

export interface SiteSeoOrganizationSettings {
  name?: string;
  legalName?: string;
  logo?: string;
  /** Контакт-источник телефона/адреса; не задан → первый контакт футера */
  contactId?: string;
}

export interface SiteSeoSettings {
  titleSuffix?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultOgImage?: string;
  favicon?: string;
  /** undefined → индексация включена */
  indexingEnabled?: boolean;
  yandexVerification?: string;
  googleVerification?: string;
  organization?: SiteSeoOrganizationSettings;
}

export type NavTarget =
  | { kind: "page"; pageId: string }
  | { kind: "category"; categoryId: string }
  | { kind: "url"; href: string; external?: boolean }
  | { kind: "action"; modal: string };

export interface NavItem {
  /** Стабильный id для key/реордера в UI */
  id: string;
  /** Подпись; для page/category опц. — фолбэк на title сущности */
  label?: string;
  target: NavTarget;
  /** Выпадашка в хедере (1 уровень вложения) */
  children?: NavItem[];
}

export interface FooterColumn {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface SiteNavigation {
  header: NavItem[];
  footer: FooterColumn[];
}

export interface SiteBreadcrumbsSettings {
  /** undefined → включено */
  enabled?: boolean;
  /** undefined → «Главная» */
  homeLabel?: string;
  /** undefined → false */
  showOnHome?: boolean;
}

export interface SiteSettings {
  contactsHeaderIds?: string[];
  contactsFooterIds?: string[];
  analytics?: SiteAnalyticsSettings;
  seo?: SiteSeoSettings;
  navigation?: SiteNavigation;
  breadcrumbs?: SiteBreadcrumbsSettings;
}

export const sites = pgTable("sites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  accessPassword: text("access_password"),
  cityId: text("city_id"),
  customDomain: text("custom_domain").unique(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  settings: jsonb("settings").$type<SiteSettings>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sitesRelations = relations(sites, () => ({}));
