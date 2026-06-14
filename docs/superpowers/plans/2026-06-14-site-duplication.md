# Дублирование сайта под город — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кнопка «Дублировать сайт» в админке создаёт новый сайт под город и копирует контент-шаблон (страницы, главную, блоки, модалки, контакты, банки/ипотеку/способы покупки, новости/акции/документы, SEO), не трогая каталог недвижимости.

**Architecture:** Сервис `site-duplication` (packages/api) в одной `db.transaction`: создаёт сайт → копирует контент-таблицы построчно с новыми id, строит карты `oldId→newId`, ремапит FK (`categoryId`/`bankId`) и ссылки на контакты внутри JSONB-блоков (project-ссылки оставляет как есть). oRPC `sites.duplicate` (adminProcedure) + UI-модалка.

**Tech Stack:** Drizzle ORM (PostgreSQL, `db.transaction`), oRPC + Zod, Nuxt 4 + @nuxt/ui v4, vitest.

**Issue:** [#65](https://github.com/alshchetinin/zhk-starter/issues/65) · **Спека:** [../specs/2026-06-14-site-duplication-design.md](../specs/2026-06-14-site-duplication-design.md)

> **Тесты:** чистую логику (`remapBlockReferences`, индекс полей) покрываем vitest (`pnpm test`). Оркестратор `duplicateSite` делает реальные БД-операции — в репо нет db-integration-харнеса, поэтому он верифицируется типами (`pnpm check-types`) + ручным прогоном (Task 5).

---

## File Structure

**Создаём:**
- `packages/api/src/services/site-duplication.ts` — сервис: `buildBlockFieldIndex`, `remapBlockReferences` (чистые), `copyRows` (хелпер), `duplicateSite` (оркестратор).
- `packages/api/src/services/__tests__/site-duplication.test.ts` — unit-тесты чистых функций.

**Модифицируем:**
- `packages/api/src/routers/sites.ts` — процедура `duplicate` (adminProcedure).
- `apps/admin/app/pages/sites/index.vue` — кнопка «Дублировать» + модалка.

---

## Task 1: Ремап ссылок в блоках (чистые функции, TDD)

**Files:**
- Create: `packages/api/src/services/site-duplication.ts`
- Create: `packages/api/src/services/__tests__/site-duplication.test.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/api/src/services/__tests__/site-duplication.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBlockFieldIndex, remapBlockReferences } from "../site-duplication";
import type { ContentBlock } from "@zhk/db/schema";

describe("buildBlockFieldIndex", () => {
  it("маппит тип блока → {имя поля → тип поля}", () => {
    const idx = buildBlockFieldIndex();
    // у блока contacts есть поле contactIds типа "contacts"
    expect(idx.get("contacts")?.get("contactIds")).toBe("contacts");
  });
});

describe("remapBlockReferences", () => {
  const idx = buildBlockFieldIndex();
  const contactsMap = new Map([["c1", "C1"], ["c2", "C2"]]);

  it("ремапит contacts-поля (массив id) на новые", () => {
    const blocks: ContentBlock[] = [
      { type: "contacts", data: { title: "Контакты", contactIds: ["c1", "c2"], showMap: true } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.contactIds).toEqual(["C1", "C2"]);
    expect(out[0]!.data.title).toBe("Контакты"); // прочее не трогаем
  });

  it("оставляет project-поля (projectId) как есть", () => {
    const blocks: ContentBlock[] = [
      { type: "project-gallery", data: { projectId: "p1" } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.projectId).toBe("p1");
  });

  it("неизвестный contactId оставляет как есть; null/undefined блоки → []", () => {
    const blocks: ContentBlock[] = [
      { type: "contacts", data: { contactIds: ["c1", "unknown"], showMap: false } },
    ];
    const out = remapBlockReferences(blocks, contactsMap, idx);
    expect(out[0]!.data.contactIds).toEqual(["C1", "unknown"]);
    expect(remapBlockReferences(null, contactsMap, idx)).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

Run: `pnpm vitest run packages/api/src/services/__tests__/site-duplication.test.ts`
Expected: FAIL (модуль `../site-duplication` не существует).

- [ ] **Step 3: Реализовать чистые функции**

Create `packages/api/src/services/site-duplication.ts`:

```ts
import type { ContentBlock } from "@zhk/db/schema";
import { allBlocks } from "../shared/blocks";

// Индекс: тип блока → (имя поля → тип поля). Из определений блоков.
export function buildBlockFieldIndex(): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>();
  for (const b of allBlocks) {
    const fields = new Map<string, string>();
    for (const f of b.fields) fields.set(f.name, f.type);
    index.set(b.type, fields);
  }
  return index;
}

// Ремап ссылок внутри блоков: contacts-поля → новые id (по карте),
// project-поля и всё остальное — как есть. Чистая функция.
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
          typeof id === "string" ? contactsMap.get(id) ?? id : id,
        );
      }
    }
    return { ...block, data };
  });
}
```

- [ ] **Step 4: Запустить — должен пройти**

Run: `pnpm vitest run packages/api/src/services/__tests__/site-duplication.test.ts`
Expected: PASS (5 ассертов). Если `b.fields`/`f.type` не совпали с реальным API определений — свериться с `packages/api/src/shared/blocks/_core.ts` (`BlockField { name, type }`, `BlockDefinition.fields`) и поправить.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/site-duplication.ts packages/api/src/services/__tests__/site-duplication.test.ts
git commit -m "feat(api): remapBlockReferences + индекс полей блоков для дублирования (#65)"
```

---

## Task 2: Оркестратор копирования (`copyRows` + `duplicateSite`)

**Files:**
- Modify: `packages/api/src/services/site-duplication.ts`

- [ ] **Step 1: Хелпер `copyRows`**

Дописать в `packages/api/src/services/site-duplication.ts` (добавить импорты вверх файла):

```ts
import { db } from "@zhk/db";
import {
  sites, contacts, banks, mortgagePrograms, pageCategories, pages, homepage,
  modals, news, promotions, documents, socialLinks, purchaseMethods, ticketSettings,
} from "@zhk/db/schema";
import { eq } from "drizzle-orm";
```

> Проверить точные экспорты имён таблиц в `@zhk/db/schema` (напр. `socialLinks`, `ticketSettings`, `purchaseMethods`, `mortgagePrograms`) — поправить под фактические. Тип транзакции `Tx` берём из самого `db.transaction` (ниже), отдельный экспорт типа не нужен.

```ts
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Копирует все строки таблицы данного сайта в новый сайт с новыми id.
// transform (опц.) правит строку (ремап FK / блоков). Возвращает карту oldId→newId.
// Таблицы все имеют id/siteId/createdAt/updatedAt — типизируем loose (Drizzle generic).
async function copyRows(
  tx: Tx,
  table: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  sourceSiteId: string,
  newSiteId: string,
  transform?: (row: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<Map<string, string>> {
  const rows = await tx.select().from(table).where(eq(table.siteId, sourceSiteId));
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
```

- [ ] **Step 2: Оркестратор `duplicateSite`**

Дописать в тот же файл:

```ts
export interface DuplicateSiteInput {
  sourceSiteId: string;
  name: string;
  slug: string;
  cityId?: string | null;
}

// Полное дублирование контента сайта в новый сайт. Вызывать внутри db.transaction.
export async function duplicateSite(tx: Tx, input: DuplicateSiteInput) {
  const source = await tx.query.sites.findFirst({ where: eq(sites.id, input.sourceSiteId) });
  if (!source) throw new Error("Source site not found");

  const newSiteId = crypto.randomUUID();

  // settings: копируем, чистим Metrika counterId; контакты ремапнём после копии контактов.
  const settings = structuredClone(source.settings ?? {});
  if (settings.analytics?.yandexMetrika) settings.analytics.yandexMetrika.counterId = "";

  // 1. Новый сайт (черновик, без домена/пароля). FK копий ссылаются на него.
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
  const contactsMap = await copyRows(tx, contacts, input.sourceSiteId, newSiteId);
  const banksMap = await copyRows(tx, banks, input.sourceSiteId, newSiteId);
  const categoriesMap = await copyRows(tx, pageCategories, input.sourceSiteId, newSiteId);
  await copyRows(tx, socialLinks, input.sourceSiteId, newSiteId);
  await copyRows(tx, purchaseMethods, input.sourceSiteId, newSiteId);
  await copyRows(tx, ticketSettings, input.sourceSiteId, newSiteId);
  await copyRows(tx, modals, input.sourceSiteId, newSiteId);

  // 3. Зависимые FK.
  await copyRows(tx, mortgagePrograms, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    bankId: row.bankId ? banksMap.get(row.bankId) ?? null : null,
  }));

  // 4. Контент с блоками (ремап contacts-ссылок).
  const fieldIndex = buildBlockFieldIndex();
  const remap = (blocks: ContentBlock[] | null | undefined) =>
    remapBlockReferences(blocks, contactsMap, fieldIndex);

  await copyRows(tx, pages, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    categoryId: row.categoryId ? categoriesMap.get(row.categoryId) ?? null : null,
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
    integrationId: null, // интеграции не копируем
    contentBlocks: remap(row.contentBlocks),
  }));
  await copyRows(tx, documents, input.sourceSiteId, newSiteId, (row) => ({
    ...row,
    contentBlocks: remap(row.contentBlocks),
  }));

  // 5. settings: ремап контакт-id в шапке/подвале.
  const remapIds = (ids?: string[]) =>
    (ids ?? []).map((id) => contactsMap.get(id) ?? id);
  const newSettings = structuredClone(settings);
  if (newSettings.contactsHeaderIds) newSettings.contactsHeaderIds = remapIds(newSettings.contactsHeaderIds);
  if (newSettings.contactsFooterIds) newSettings.contactsFooterIds = remapIds(newSettings.contactsFooterIds);
  await tx.update(sites).set({ settings: newSettings }).where(eq(sites.id, newSiteId));

  const created = await tx.query.sites.findFirst({ where: eq(sites.id, newSiteId) });
  return created!;
}
```

> Если какой-то таблицы НЕТ среди копируемых по факту схемы (напр. иное имя экспорта) — свериться со `packages/db/src/schema/index.ts`. `promotions` имеет join `promotion_apartments` (→ apartments) — его НЕ копируем (каталог исключён). `news`/`promotions`/`documents` копируем по решению из спеки; `tags`/каталог/интеграции — нет.

- [ ] **Step 3: check-types**

Run: `pnpm check-types`
Expected: `@zhk/api` без НОВЫХ ошибок от этого файла (loose `any` на table/tx — осознанно; если `settings.analytics?.yandexMetrika` типизирован строго и counterId required — это ок, мы присваиваем строку). Pre-existing ошибки в других файлах — игнор.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/site-duplication.ts
git commit -m "feat(api): оркестратор duplicateSite — копирование контента сайта (#65)"
```

---

## Task 3: oRPC процедура `sites.duplicate`

**Files:**
- Modify: `packages/api/src/routers/sites.ts`

- [ ] **Step 1: Добавить процедуру**

In `packages/api/src/routers/sites.ts`:
- Добавить импорты (вверх файла, рядом с существующими): `import { z } from "zod";` (если ещё нет), `import { ORPCError } from "@orpc/server";` (если ещё нет), `import { duplicateSite } from "../services/site-duplication";`, `import { eq } from "drizzle-orm";` (если ещё нет), `import { sites } from "@zhk/db/schema";` (если ещё нет), `import { db } from "@zhk/db";` (если ещё нет).
- Добавить в объект `sitesRouter` (рядом с `create`):

```ts
  duplicate: adminProcedure
    .input(
      z.object({
        sourceSiteId: z.string(),
        name: z.string().min(1),
        slug: z.string().min(1),
        cityId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const slugTaken = await db.query.sites.findFirst({
        where: eq(sites.slug, input.slug),
        columns: { id: true },
      });
      if (slugTaken) {
        throw new ORPCError("CONFLICT", { message: "Сайт с таким slug уже существует" });
      }
      return db.transaction((tx) => duplicateSite(tx, input));
    }),
```

> Свериться с фактическими импортами файла (что уже импортировано — не дублировать). `adminProcedure` уже импортируется (используется в `create`).

- [ ] **Step 2: check-types**

Run: `pnpm check-types`
Expected: без новых ошибок в `sites.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/sites.ts
git commit -m "feat(api): процедура sites.duplicate (adminProcedure, транзакция, slug-валидация) (#65)"
```

---

## Task 4: Admin UI — кнопка «Дублировать» + модалка

**Files:**
- Modify: `apps/admin/app/pages/sites/index.vue`

- [ ] **Step 1: Состояние + мутация + список городов**

In `apps/admin/app/pages/sites/index.vue` `<script setup>` (рядом с существующими `useQuery`/`useMutation`; `$orpc`/`$orpcClient` уже из `useNuxtApp()`, `queryClient`, `toast`):

```ts
const showDuplicate = ref(false);
const dupSource = ref<{ id: string; name: string } | null>(null);
const dupForm = reactive({ name: "", slug: "", cityId: "" });

const { data: citiesData } = useQuery($orpc.cities.list.queryOptions());
const cityItems = computed(() => [
  { label: "Без города", value: "" },
  ...(citiesData.value?.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id })) ?? []),
]);

function openDuplicate(site: { id: string; name: string }) {
  dupSource.value = site;
  dupForm.name = `${site.name} (копия)`;
  dupForm.slug = "";
  dupForm.cityId = "";
  showDuplicate.value = true;
}
watch(() => dupForm.name, (v) => { dupForm.slug = slugify(v); });

const duplicateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.duplicate({
      sourceSiteId: dupSource.value!.id,
      name: dupForm.name,
      slug: dupForm.slug,
      cityId: dupForm.cityId || null,
    }),
  onSuccess: (created: { id: string }) => {
    toast.add({ title: "Сайт продублирован", color: "success" });
    showDuplicate.value = false;
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    navigateTo(`/sites/${created.id}`);
  },
  onError: () => {
    toast.add({ title: "Не удалось продублировать (проверьте slug)", color: "error" });
  },
});
```

> `slugify` — авто-импорт из admin utils (используется в `pages/create.vue`). `navigateTo` — Nuxt авто-импорт. Если `cities.list` возвращает иную форму — поправить `cityItems`.

- [ ] **Step 2: Кнопка в строке сайта**

В блоке per-row actions (рядом с кнопками «сделать основным»/редактировать/удалить) добавить:

```vue
            <UButton
              variant="ghost"
              size="sm"
              icon="i-solar-copy-linear"
              title="Дублировать"
              @click="openDuplicate({ id: item.id, name: item.name })"
            />
```

- [ ] **Step 3: Модалка**

Перед закрывающим тегом контейнера страницы (рядом с модалкой создания, если есть) добавить:

```vue
    <UModal v-model:open="showDuplicate" title="Дублировать сайт">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-(--ui-text-muted)">
            Копируется контент-шаблон (страницы, главная, блоки, модалки, контакты,
            банки/ипотека, новости/акции/документы, SEO). Каталог недвижимости и
            интеграции НЕ копируются — город синкает свой. Новый сайт создаётся
            как черновик (неактивен).
          </p>
          <UFormField label="Название">
            <UInput v-model="dupForm.name" placeholder="Название нового сайта" />
          </UFormField>
          <UFormField label="Slug" description="Уникальный путь сайта">
            <UInput v-model="dupForm.slug" placeholder="url-slug" />
          </UFormField>
          <UFormField label="Город">
            <USelect v-model="dupForm.cityId" :items="cityItems" placeholder="Без города" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="showDuplicate = false">Отмена</UButton>
          <UButton
            color="primary"
            :loading="duplicateMutation.isPending.value"
            :disabled="!dupForm.name.trim() || !dupForm.slug.trim()"
            @click="duplicateMutation.mutate()"
          >
            Дублировать
          </UButton>
        </div>
      </template>
    </UModal>
```

- [ ] **Step 4: check-types + nuxi prepare**

Run: `pnpm check-types` (Vue SFC не проверяется типами, но api — да); затем `pnpm --filter zhk-admin exec nuxi prepare` (должно пройти).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/pages/sites/index.vue
git commit -m "feat(admin): кнопка и модалка «Дублировать сайт» (#65)"
```

---

## Task 5: Ручная проверка + запись в /dev/docs

**Files:**
- Modify: `apps/admin/app/pages/dev/docs/index.vue` (короткая запись в раздел, опц.)

- [ ] **Step 1: Smoke-тест в браузере**

Run: `pnpm dev:admin` (+ `pnpm dev:server`). В админке → «Сайты» → у любого сайта нажать «Дублировать» → заполнить имя/slug/город → Дублировать.
Expected:
- Создан новый сайт (черновик, неактивен), открылась его страница.
- У нового сайта есть скопированные страницы/главная/блоки, контакты, банки/ипотека и т.д.
- Контакт-ссылки в блоках указывают на НОВЫЕ контакты; project-ссылки — на исходные проекты (кросс-сайт, до перелинка).
- Каталог (проекты/дома/квартиры) — пуст.
- `settings.contacts*Ids` ремапнуты; Metrika counterId пуст; домен/пароль пусты.
- Повторный slug → ошибка-тост, сайт не создан (откат транзакции).

- [ ] **Step 2: Запись в /dev/docs (раздел «Сайты»/новый пункт)**

В `apps/admin/app/pages/dev/docs/index.vue` добавить пункт в `sections` (`{ id: "site-duplication", label: "Дублирование сайта", icon: "i-solar-copy-linear" }`) и соответствующий `<article v-if="activeSection === 'site-duplication'">` с кратким описанием: что копируется/нет, как обрабатываются ссылки в блоках (project оставляем, contacts ремапим), что новый сайт — черновик, где код (`packages/api/src/services/site-duplication.ts`). Стиль — как у существующих разделов (`<section>`/`<h2>`/`<h3>`/`callout`/`<ul class="font-mono text-xs">`).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/pages/dev/docs/index.vue
git commit -m "docs(admin): раздел «Дублирование сайта» в /dev/docs (#65)"
```

---

## Финальная верификация

- [ ] **Тесты + типы**

Run: `pnpm test` (новые unit-тесты `site-duplication` зелёные) и `pnpm check-types` (без новых ошибок).

- [ ] **Обновить issue**

```bash
gh issue comment 65 --body "Реализовано по плану docs/superpowers/plans/2026-06-14-site-duplication.md. Готово к ревью."
```
