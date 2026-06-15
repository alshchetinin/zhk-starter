import { db } from "@zhk/db";
import type { ContentBlock, SiteSettings } from "@zhk/db/schema";
import {
  sites,
  contacts,
  banks,
  mortgagePrograms,
  pageCategories,
  pages,
  homepage,
  modals,
  news,
  promotions,
  documents,
  socialLinks,
  purchaseMethods,
} from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { allBlocks } from "../shared/blocks";

/**
 * Индекс: тип блока → (имя поля → тип поля).
 * Строится из деклараций блоков один раз и переиспользуется.
 */
export function buildBlockFieldIndex(): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>();
  for (const b of allBlocks) {
    const fields = new Map<string, string>();
    for (const f of b.fields) fields.set(f.name, f.type);
    index.set(b.type, fields);
  }
  return index;
}

/**
 * Ремап ссылок внутри блоков контента: поля типа `contacts` (массив id)
 * переводятся в новые id по карте `contactsMap`; `project`-поля и всё
 * остальное — остаются без изменений. Чистая функция (не мутирует входные данные).
 *
 * @param blocks       - массив блоков (null/undefined → пустой массив)
 * @param contactsMap  - Map<старый contactId, новый contactId>
 * @param fieldIndex   - результат buildBlockFieldIndex()
 */
export function remapBlockReferences(
  blocks: ContentBlock[] | null | undefined,
  contactsMap: Map<string, string>,
  fieldIndex: Map<string, Map<string, string>>,
): ContentBlock[] {
  if (!blocks) return [];
  return blocks.map((block) => {
    const fields = fieldIndex.get(block.type);
    if (!fields) return block;
    const data: Record<string, unknown> = { ...block.data };
    for (const [name, type] of fields) {
      if (type !== "contacts") continue;
      const val = data[name];
      if (typeof val === "string") {
        data[name] = contactsMap.get(val) ?? val;
      } else if (Array.isArray(val)) {
        data[name] = val.map((id) =>
          typeof id === "string" ? (contactsMap.get(id) ?? id) : id,
        );
      }
    }
    return { ...block, data };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Копирует все строки таблицы данного сайта в новый сайт с новыми id.
 * `transform` (опц.) правит строку (ремап FK / блоков). Возвращает карту
 * oldId → newId.
 */
async function copyRows(
  tx: Tx,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  sourceSiteId: string,
  newSiteId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform?: (row: any) => any,
): Promise<Map<string, string>> {
  const rows = await tx
    .select()
    .from(table)
    .where(eq(table.siteId, sourceSiteId));
  const idMap = new Map<string, string>();
  for (const row of rows) {
    const newId = crypto.randomUUID();
    idMap.set(row.id, newId);
    const { createdAt: _c, updatedAt: _u, ...rest } = row;
    let next = { ...rest, id: newId, siteId: newSiteId };
    if (transform) next = transform(next);
    await tx.insert(table).values(next);
  }
  return idMap;
}

export interface DuplicateSiteInput {
  sourceSiteId: string;
  name: string;
  slug: string;
  cityId?: string | null;
}

/**
 * Полное дублирование контента сайта в новый сайт (черновик). Копируются
 * контент-шаблонные таблицы (страницы, главная, новости, акции, документы,
 * контакты, банки, ипотека, категории, соцссылки, способы покупки, модалки)
 * с новыми id; FK-колонки и contacts-ссылки внутри JSONB
 * блоков ремапятся. Каталог недвижимости, интеграции, история версий и теги
 * НЕ копируются. Вызывать внутри `db.transaction`.
 */
export async function duplicateSite(tx: Tx, input: DuplicateSiteInput) {
  const [source] = await tx
    .select()
    .from(sites)
    .where(eq(sites.id, input.sourceSiteId));
  if (!source) throw new Error("Source site not found");

  const newSiteId = crypto.randomUUID();

  // settings: копируем, чистим Metrika counterId; контакты ремапнём после
  // копии контактов.
  const settings: SiteSettings = structuredClone(source.settings ?? {});
  if (settings.analytics?.yandexMetrika) {
    settings.analytics.yandexMetrika.counterId = "";
  }

  // 1. Новый сайт (черновик). FK копий ссылаются на него.
  await tx.insert(sites).values({
    id: newSiteId,
    slug: input.slug,
    name: input.name,
    cityId: input.cityId ?? null,
    isPrimary: false,
    isActive: false,
    customDomain: null,
    accessPassword: null,
    settings,
  });

  // 2. Контент без внутренних зависимостей.
  const contactsMap = await copyRows(
    tx,
    contacts,
    input.sourceSiteId,
    newSiteId,
  );
  const banksMap = await copyRows(tx, banks, input.sourceSiteId, newSiteId);
  const categoriesMap = await copyRows(
    tx,
    pageCategories,
    input.sourceSiteId,
    newSiteId,
  );
  await copyRows(tx, socialLinks, input.sourceSiteId, newSiteId);
  await copyRows(tx, purchaseMethods, input.sourceSiteId, newSiteId);
  await copyRows(tx, modals, input.sourceSiteId, newSiteId);

  // 3. Зависимые FK.
  await copyRows(tx, mortgagePrograms, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    bankId: row.bankId ? (banksMap.get(row.bankId) ?? null) : null,
  }));

  // 4. Контент с блоками (ремап contacts-ссылок).
  const fieldIndex = buildBlockFieldIndex();
  const remap = (blocks: ContentBlock[] | null | undefined) =>
    remapBlockReferences(blocks, contactsMap, fieldIndex);

  await copyRows(tx, pages, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    categoryId: row.categoryId
      ? (categoriesMap.get(row.categoryId) ?? null)
      : null,
    contentBlocks: remap(row.contentBlocks),
  }));
  await copyRows(tx, homepage, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    contentBlocks: remap(row.contentBlocks),
  }));
  await copyRows(tx, news, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    contentBlocks: remap(row.contentBlocks),
  }));
  await copyRows(tx, promotions, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    integrationId: null,
    externalId: null, // не тащим привязку к синку источника
    contentBlocks: remap(row.contentBlocks),
  }));
  await copyRows(tx, documents, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    contentBlocks: remap(row.contentBlocks),
  }));

  // 5. settings: ремап контакт-id в шапке/подвале.
  const remapIds = (ids?: string[]) =>
    (ids ?? []).map((id) => contactsMap.get(id) ?? id);
  const newSettings: SiteSettings = structuredClone(settings);
  if (newSettings.contactsHeaderIds) {
    newSettings.contactsHeaderIds = remapIds(newSettings.contactsHeaderIds);
  }
  if (newSettings.contactsFooterIds) {
    newSettings.contactsFooterIds = remapIds(newSettings.contactsFooterIds);
  }
  // seo.organization.contactId — тоже ссылка на контакт, ремапим
  const orgContactId = newSettings.seo?.organization?.contactId;
  if (orgContactId && newSettings.seo?.organization) {
    newSettings.seo.organization.contactId = contactsMap.get(orgContactId) ?? orgContactId;
  }
  await tx
    .update(sites)
    .set({ settings: newSettings })
    .where(eq(sites.id, newSiteId));

  const [created] = await tx
    .select()
    .from(sites)
    .where(eq(sites.id, newSiteId));
  return created!;
}
