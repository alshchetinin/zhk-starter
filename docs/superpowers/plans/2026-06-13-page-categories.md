# Категории страниц — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить жёсткую связь страница→проект (`pages.projectId`) на управляемую таксономию «Категории страниц» для группировки и фильтрации в админке.

**Architecture:** Новая first-class сущность `page_categories` (CRUD, скоуп по сайту) + FK `pages.categoryId` (nullable, `onDelete: set null`). oRPC-роутер `pageCategories`, фильтр/бейдж в списке страниц, управление через модалку, select категории с inline-созданием в редакторе. Веб не трогаем; `projectId` дропается без миграции данных.

**Tech Stack:** Drizzle ORM (PostgreSQL), oRPC + Zod, Nuxt 4 + @nuxt/ui v4, TanStack vue-query.

**Issue:** [#63](https://github.com/alshchetinin/zhk-starter/issues/63) · **Спека:** [docs/superpowers/specs/2026-06-13-page-categories-design.md](../specs/2026-06-13-page-categories-design.md)

> **Заметка о тестах:** CRUD-роутеры в этом репозитории юнит-тестами не покрыты (тесты есть только для middleware/blocks-логики). Поэтому верификация задач — через `pnpm check-types` (типы oRPC+Drizzle ловят рассинхрон) и ручную проверку в админке (`pnpm dev:admin`). Это осознанное решение из спеки, а не пропуск TDD.

---

## File Structure

**Создаём:**
- `packages/db/src/schema/page-categories.ts` — таблица + relations.
- `packages/api/src/routers/page-categories.ts` — CRUD-роутер (list/create/update/reorder/delete).
- `apps/admin/app/composables/useCategoryOptions.ts` — опции для `USelect` редактора.
- `apps/admin/app/components/CategorySelect.vue` — select категории + inline-создание (для редактора страницы).
- `apps/admin/app/components/PageCategoriesModal.vue` — модалка управления категориями (для списка страниц).

**Модифицируем:**
- `packages/db/src/schema/pages.ts` — `projectId` → `categoryId`, relation `project` → `category`.
- `packages/db/src/schema/projects.ts` — убрать relation `pages`.
- `packages/db/src/schema/index.ts` — экспорт новой схемы.
- `packages/api/src/routers/index.ts` — регистрация роутера.
- `packages/api/src/routers/pages.ts` — `projectId` → `categoryId` в list/getById/create/update.
- `packages/api/src/routers/public/pages.ts` — убрать `with: { project }`.
- `apps/server/src/seed.ts` — сид 3 дефолтных категорий.
- `apps/admin/app/pages/pages/create.vue` — select категории вместо проекта.
- `apps/admin/app/pages/pages/[id].vue` — select категории вместо проекта.
- `apps/admin/app/pages/pages/index.vue` — фильтр + бейдж категории + кнопка «Категории» + модалка.
- `apps/admin/app/pages/projects/[id].vue` — убрать вкладку «На сайте».

**Удаляем:**
- `apps/admin/app/pages/projects/[id]/website.vue` — вкладка теряет источник данных.

---

## Task 1: Схема БД

**Files:**
- Create: `packages/db/src/schema/page-categories.ts`
- Modify: `packages/db/src/schema/pages.ts`
- Modify: `packages/db/src/schema/projects.ts:9,69`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Создать таблицу `page_categories`**

Create `packages/db/src/schema/page-categories.ts`:

```ts
import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { pages } from "./pages";

export const pageCategories = pgTable("page_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const pageCategoriesRelations = relations(pageCategories, ({ one, many }) => ({
  site: one(sites, {
    fields: [pageCategories.siteId],
    references: [sites.id],
  }),
  pages: many(pages),
}));
```

- [ ] **Step 2: Переписать `pages.ts` (projectId → categoryId)**

Replace the entire contents of `packages/db/src/schema/pages.ts` with:

```ts
import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { pageStatusEnum } from "./_enums";
import type { ContentBlock } from "./_shared";
import { sites } from "./sites";
import { pageCategories } from "./page-categories";

export const pages = pgTable("pages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  status: pageStatusEnum("status").notNull().default("draft"),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  categoryId: text("category_id").references(() => pageCategories.id, { onDelete: "set null" }),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const pagesRelations = relations(pages, ({ one }) => ({
  site: one(sites, {
    fields: [pages.siteId],
    references: [sites.id],
  }),
  category: one(pageCategories, {
    fields: [pages.categoryId],
    references: [pageCategories.id],
  }),
}));
```

- [ ] **Step 3: Убрать relation `pages` из `projects.ts`**

In `packages/db/src/schema/projects.ts`:
- Delete the import line `import { pages } from "./pages";` (line ~9).
- Delete the line `  pages: many(pages),` (line ~69) inside `projectsRelations`.

Verify `pages` is not referenced elsewhere in the file (it isn't — only those two lines).

- [ ] **Step 4: Экспортировать новую схему**

In `packages/db/src/schema/index.ts`, add next to the other exports (e.g. right after the `./pages` export):

```ts
export * from "./page-categories";
```

- [ ] **Step 5: Применить схему к БД**

Run: `pnpm db:push`
Expected: drizzle-kit drops column `pages.project_id`, creates table `page_categories`, adds column `pages.category_id`. No errors.

- [ ] **Step 6: Проверить типы**

Run: `pnpm check-types`
Expected: PASS (no references to `pages.projectId` remain in `packages/db`).

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/schema
git commit -m "feat(db): таблица page_categories + pages.categoryId, дроп projectId (#63)"
```

---

## Task 2: API-роутер `pageCategories` + правки `pages`

**Files:**
- Create: `packages/api/src/routers/page-categories.ts`
- Modify: `packages/api/src/routers/index.ts`
- Modify: `packages/api/src/routers/pages.ts`
- Modify: `packages/api/src/routers/public/pages.ts`

- [ ] **Step 1: Создать роутер `pageCategories`**

Create `packages/api/src/routers/page-categories.ts`:

```ts
import { z } from "zod";
import { db } from "@zhk/db";
import { pageCategories, pages } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";

export const pageCategoriesRouter = {
  list: siteProcedure.handler(async ({ context }) => {
    const cats = await db.query.pageCategories.findMany({
      where: eq(pageCategories.siteId, context.siteId),
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.title)],
    });
    const counts = await db
      .select({ categoryId: pages.categoryId, c: count() })
      .from(pages)
      .where(eq(pages.siteId, context.siteId))
      .groupBy(pages.categoryId);
    const countMap = new Map(counts.map((r) => [r.categoryId, Number(r.c)]));
    return cats.map((c) => ({ ...c, pageCount: countMap.get(c.id) ?? 0 }));
  }),

  create: siteProcedure
    .input(z.object({ title: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(pageCategories)
        .where(eq(pageCategories.siteId, context.siteId));
      const [created] = await db
        .insert(pageCategories)
        .values({
          siteId: context.siteId,
          title: input.title,
          sortOrder: total ?? 0,
        })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [updated] = await db
        .update(pageCategories)
        .set({ title: input.title })
        .where(
          and(
            eq(pageCategories.id, input.id),
            eq(pageCategories.siteId, context.siteId),
          ),
        )
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Категория не найдена" });
      }
      return updated;
    }),

  reorder: siteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      await Promise.all(
        input.ids.map((id, i) =>
          db
            .update(pageCategories)
            .set({ sortOrder: i })
            .where(
              and(
                eq(pageCategories.id, id),
                eq(pageCategories.siteId, context.siteId),
              ),
            ),
        ),
      );
      return { success: true };
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(pageCategories)
        .where(
          and(
            eq(pageCategories.id, input.id),
            eq(pageCategories.siteId, context.siteId),
          ),
        )
        .returning({ id: pageCategories.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Категория не найдена" });
      }
      return { success: true };
    }),
};
```

- [ ] **Step 2: Зарегистрировать роутер**

In `packages/api/src/routers/index.ts`:
- Add import (next to the other router imports): `import { pageCategoriesRouter } from "./page-categories";`
- Add entry to the `appRouter` object (e.g. right after `pages: pagesRouter,`): `pageCategories: pageCategoriesRouter,`

- [ ] **Step 3: Заменить projectId → categoryId в `pages` роутере**

In `packages/api/src/routers/pages.ts` apply these exact changes:

In `list` input — replace `projectId: z.string().optional(),` with `categoryId: z.string().optional(),`.

In the `list` handler — replace:
```ts
      const { page, pageSize, status, search, projectId } = input;
      const conditions = [eq(pages.siteId, context.siteId)];
      if (status) conditions.push(eq(pages.status, status));
      if (search) conditions.push(ilike(pages.title, `%${search}%`));
      if (projectId) conditions.push(eq(pages.projectId, projectId));
```
with:
```ts
      const { page, pageSize, status, search, categoryId } = input;
      const conditions = [eq(pages.siteId, context.siteId)];
      if (status) conditions.push(eq(pages.status, status));
      if (search) conditions.push(ilike(pages.title, `%${search}%`));
      if (categoryId) conditions.push(eq(pages.categoryId, categoryId));
```

In the `list` query — replace `with: { project: { columns: { id: true, name: true } } },` with `with: { category: { columns: { id: true, title: true } } },`.

In `getById` — replace `with: { project: { columns: { id: true, name: true } } },` with `with: { category: { columns: { id: true, title: true } } },`.

In `create` input — replace `projectId: z.string().nullable().optional(),` with `categoryId: z.string().nullable().optional(),`.

In the `create` insert values — replace `projectId: input.projectId ?? null,` with `categoryId: input.categoryId ?? null,`.

In `update` input — replace `projectId: z.string().nullable().optional(),` with `categoryId: z.string().nullable().optional(),`.

(The `update` handler iterates over fields generically — no further change needed.)

- [ ] **Step 4: Убрать project из публичного роутера**

In `packages/api/src/routers/public/pages.ts`, in both `list` and `getBySlug`, delete the line:
```ts
          with: { project: { columns: { id: true, name: true } } },
```
(In `list` it sits inside `findMany`; in `getBySlug` inside `findFirst`. Remove both.)

- [ ] **Step 5: Проверить типы**

Run: `pnpm check-types`
Expected: PASS. No remaining references to `pages.projectId` / `page.project` in `packages/api`.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers
git commit -m "feat(api): роутер pageCategories, pages.categoryId вместо projectId (#63)"
```

---

## Task 3: Сид дефолтных категорий

**Files:**
- Modify: `apps/server/src/seed.ts`

- [ ] **Step 1: Добавить `and` в импорт drizzle-orm**

In `apps/server/src/seed.ts`, change `import { eq } from "drizzle-orm";` to:
```ts
import { and, eq } from "drizzle-orm";
```

- [ ] **Step 2: Засидить 3 категории после создания дефолтного сайта**

In `apps/server/src/seed.ts`, locate the end of the default-site block (right after the `} else { console.log("Default site already exists. Skipping."); }`). Insert immediately after it, **before** the admin-user existence check:

```ts
  const defaultCategories = [
    { title: "Проекты", sortOrder: 0 },
    { title: "Способы покупки", sortOrder: 1 },
    { title: "Второстепенные", sortOrder: 2 },
  ];
  for (const cat of defaultCategories) {
    const exists = await db
      .select({ id: schema.pageCategories.id })
      .from(schema.pageCategories)
      .where(
        and(
          eq(schema.pageCategories.siteId, "default"),
          eq(schema.pageCategories.title, cat.title),
        ),
      )
      .limit(1);
    if (exists.length === 0) {
      await db.insert(schema.pageCategories).values({
        siteId: "default",
        title: cat.title,
        sortOrder: cat.sortOrder,
      });
      console.log(`Page category "${cat.title}" created`);
    }
  }
```

Note: this runs before the admin-user block's early `process.exit(0)`, so re-running `db:seed` still seeds categories even when the admin already exists. The `exists` check keeps it idempotent.

- [ ] **Step 3: Запустить сид и проверить**

Run: `pnpm db:seed`
Expected: logs `Page category "Проекты" created` etc. on first run; on second run no category logs (idempotent).

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/seed.ts
git commit -m "feat(server): сид дефолтных категорий страниц (#63)"
```

---

## Task 4: Композабл `useCategoryOptions`

**Files:**
- Create: `apps/admin/app/composables/useCategoryOptions.ts`

- [ ] **Step 1: Создать композабл**

Create `apps/admin/app/composables/useCategoryOptions.ts`:

```ts
import { useQuery } from "@tanstack/vue-query";

export const CATEGORY_NONE = "_none";

export function useCategoryOptions() {
  const { $orpc } = useNuxtApp();

  const { data: categoriesData } = useQuery(
    computed(() => $orpc.pageCategories.list.queryOptions()),
  );

  const options = computed(() => [
    { label: "Без категории", value: CATEGORY_NONE },
    ...(categoriesData.value?.map((c) => ({ label: c.title, value: c.id })) ?? []),
  ]);

  return { options };
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/composables/useCategoryOptions.ts
git commit -m "feat(admin): композабл useCategoryOptions (#63)"
```

---

## Task 5: Компонент `CategorySelect` (select + inline-создание)

**Files:**
- Create: `apps/admin/app/components/CategorySelect.vue`

- [ ] **Step 1: Создать компонент**

Create `apps/admin/app/components/CategorySelect.vue`:

```vue
<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const model = defineModel<string>({ required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const queryClient = useQueryClient();
const { options } = useCategoryOptions();

const creating = ref(false);
const newTitle = ref("");

const createMut = useMutation({
  mutationFn: () => $orpcClient.pageCategories.create({ title: newTitle.value.trim() }),
  onSuccess: (created) => {
    queryClient.invalidateQueries({ queryKey: $orpc.pageCategories.key() });
    model.value = created.id;
    newTitle.value = "";
    creating.value = false;
  },
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <USelect v-model="model" :items="options" placeholder="Без категории" class="flex-1" />
      <UButton
        variant="ghost"
        icon="i-solar-add-circle-linear"
        title="Новая категория"
        @click="creating = !creating"
      />
    </div>
    <div v-if="creating" class="flex items-center gap-2">
      <UInput
        v-model="newTitle"
        size="sm"
        placeholder="Название категории"
        class="flex-1"
        @keydown.enter.prevent="newTitle.trim() && createMut.mutate()"
      />
      <UButton
        size="sm"
        :loading="createMut.isPending.value"
        :disabled="!newTitle.trim()"
        @click="createMut.mutate()"
      >
        Добавить
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/components/CategorySelect.vue
git commit -m "feat(admin): CategorySelect с inline-созданием категории (#63)"
```

---

## Task 6: Редактор страницы — категория вместо проекта

**Files:**
- Modify: `apps/admin/app/pages/pages/create.vue`
- Modify: `apps/admin/app/pages/pages/[id].vue`

- [ ] **Step 1: `create.vue` — заменить проект на категорию**

In `apps/admin/app/pages/pages/create.vue`:

Delete the line `const { options: projectOptions } = useProjectOptions();`.

In the `form` reactive object, replace `projectId: (route.query.projectId as string) || PROJECT_NONE,` with `categoryId: CATEGORY_NONE,`.

In the `createMutation` `mutationFn`, replace `projectId: form.projectId === PROJECT_NONE ? null : form.projectId,` with `categoryId: form.categoryId === CATEGORY_NONE ? null : form.categoryId,`.

In the template, replace the «Проект» form field:
```vue
          <UFormField label="Проект">
            <USelect v-model="form.projectId" :items="projectOptions" placeholder="Без проекта" />
          </UFormField>
```
with:
```vue
          <UFormField label="Категория">
            <CategorySelect v-model="form.categoryId" />
          </UFormField>
```

Also delete the line `const route = useRoute();` — it was used only for `route.query.projectId`, which is now gone. (`router` from `useRouter()` stays — it drives the post-create redirect.)

- [ ] **Step 2: `[id].vue` — заменить проект на категорию**

In `apps/admin/app/pages/pages/[id].vue`:

Delete the line `const { options: projectOptions } = useProjectOptions();`.

In the `form` reactive object, replace `projectId: PROJECT_NONE,` with `categoryId: CATEGORY_NONE,`.

In the `whenever(pageData, ...)` hydration block, replace `form.projectId = val.projectId ?? PROJECT_NONE;` with `form.categoryId = val.categoryId ?? CATEGORY_NONE;`.

In `updateMutation.mutationFn`, replace `projectId: form.projectId === PROJECT_NONE ? null : form.projectId,` with `categoryId: form.categoryId === CATEGORY_NONE ? null : form.categoryId,`.

In `updateMutation.onMutate` (the `setQueryData` object), replace `projectId: form.projectId === PROJECT_NONE ? null : form.projectId,` with `categoryId: form.categoryId === CATEGORY_NONE ? null : form.categoryId,`.

In the template, replace the «Проект» form field:
```vue
            <UFormField label="Проект">
              <USelect v-model="form.projectId" :items="projectOptions" placeholder="Без проекта" />
            </UFormField>
```
with:
```vue
            <UFormField label="Категория">
              <CategorySelect v-model="form.categoryId" />
            </UFormField>
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 4: Ручная проверка**

Run: `pnpm dev:admin`, открыть `/pages/create` и существующую `/pages/{id}`.
Expected: поле «Категория» с селектом, кнопка «+» открывает инпут, создание добавляет категорию и выбирает её; сохранение страницы с категорией работает.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/pages/pages/create.vue apps/admin/app/pages/pages/[id].vue
git commit -m "feat(admin): категория вместо проекта в редакторе страницы (#63)"
```

---

## Task 7: Модалка управления категориями

**Files:**
- Create: `apps/admin/app/components/PageCategoriesModal.vue`

- [ ] **Step 1: Создать модалку**

Create `apps/admin/app/components/PageCategoriesModal.vue`:

```vue
<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const open = defineModel<boolean>("open", { required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();

const { data: categories } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);

function invalidate() {
  queryClient.invalidateQueries({ queryKey: $orpc.pageCategories.key() });
  queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
}

const newTitle = ref("");
const createMut = useMutation({
  mutationFn: () => $orpcClient.pageCategories.create({ title: newTitle.value.trim() }),
  onSuccess: () => {
    newTitle.value = "";
    invalidate();
  },
});

const renameMut = useMutation({
  mutationFn: (v: { id: string; title: string }) => $orpcClient.pageCategories.update(v),
  onSuccess: invalidate,
});

const reorderMut = useMutation({
  mutationFn: (ids: string[]) => $orpcClient.pageCategories.reorder({ ids }),
  onSuccess: invalidate,
});

const deleteMut = useMutation({
  mutationFn: (id: string) => $orpcClient.pageCategories.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Категория удалена", color: "success" });
    toDelete.value = null;
    invalidate();
  },
});

const toDelete = ref<{ id: string; title: string; pageCount: number } | null>(null);

// Local editable copies of titles, keyed by category id. Avoids relying on
// UInput's change-event payload — rename reads from this map on blur.
const titles = reactive<Record<string, string>>({});
watch(
  categories,
  (cats) => {
    if (!cats) return;
    for (const c of cats) {
      if (titles[c.id] === undefined) titles[c.id] = c.title;
    }
  },
  { immediate: true },
);

function move(index: number, dir: -1 | 1) {
  const list = categories.value ? [...categories.value] : [];
  const target = index + dir;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
  reorderMut.mutate(list.map((c) => c.id));
}

function rename(id: string, current: string) {
  const next = (titles[id] ?? "").trim();
  if (!next || next === current) return;
  renameMut.mutate({ id, title: next });
}
</script>

<template>
  <UModal v-model:open="open" title="Категории страниц">
    <template #body>
      <div class="space-y-2">
        <div
          v-for="(cat, i) in categories ?? []"
          :key="cat.id"
          class="flex items-center gap-2"
        >
          <div class="flex flex-col">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-solar-alt-arrow-up-linear"
              :disabled="i === 0"
              @click="move(i, -1)"
            />
            <UButton
              variant="ghost"
              size="xs"
              icon="i-solar-alt-arrow-down-linear"
              :disabled="i === (categories?.length ?? 0) - 1"
              @click="move(i, 1)"
            />
          </div>
          <UInput
            v-model="titles[cat.id]"
            size="sm"
            class="flex-1"
            @blur="rename(cat.id, cat.title)"
            @keydown.enter.prevent="rename(cat.id, cat.title)"
          />
          <span class="text-xs text-(--ui-text-dimmed) tabular-nums w-16 text-right">
            {{ cat.pageCount }} стр.
          </span>
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            icon="i-solar-trash-bin-trash-linear"
            @click="toDelete = { id: cat.id, title: cat.title, pageCount: cat.pageCount }"
          />
        </div>

        <p v-if="!categories?.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
          Категорий пока нет.
        </p>

        <div class="flex items-center gap-2 pt-2 border-t border-(--ui-border)">
          <UInput
            v-model="newTitle"
            size="sm"
            placeholder="Новая категория"
            class="flex-1"
            @keydown.enter.prevent="newTitle.trim() && createMut.mutate()"
          />
          <UButton
            size="sm"
            :loading="createMut.isPending.value"
            :disabled="!newTitle.trim()"
            @click="createMut.mutate()"
          >
            Добавить
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    :open="toDelete != null"
    title="Удалить категорию?"
    @update:open="(v: boolean) => { if (!v) toDelete = null }"
  >
    <template #body>
      <p class="text-sm text-(--ui-text-muted)">
        Категория <b>{{ toDelete?.title ?? '—' }}</b> будет удалена.
        <template v-if="toDelete?.pageCount">
          У {{ toDelete.pageCount }} страниц(ы) категория будет снята (сами страницы останутся).
        </template>
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" @click="toDelete = null">Отмена</UButton>
        <UButton
          color="error"
          :loading="deleteMut.isPending.value"
          @click="toDelete && deleteMut.mutate(toDelete.id)"
        >
          Удалить
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/components/PageCategoriesModal.vue
git commit -m "feat(admin): модалка управления категориями страниц (#63)"
```

---

## Task 8: Список страниц — фильтр, бейдж, кнопка «Категории»

**Files:**
- Modify: `apps/admin/app/pages/pages/index.vue`

- [ ] **Step 1: Добавить состояние и запрос категорий в `<script setup>`**

In `apps/admin/app/pages/pages/index.vue`, add after `const statusFilter = ref<PageStatus>();`:

```ts
const categoryFilter = ref<string>("");
const categoriesModalOpen = ref(false);

const { data: categoriesData } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);
const categoryFilterItems = computed(() => [
  { label: "Все категории", value: "" },
  ...(categoriesData.value?.map((c) => ({ label: c.title, value: c.id })) ?? []),
]);
```

(`useQuery` is already imported at the top of the file.)

In the `useQuery` for the list, add `categoryId` to the input:
```ts
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
        categoryId: categoryFilter.value || undefined,
      },
```

Update the reset watcher to include the category filter:
```ts
watch([debouncedSearch, statusFilter, categoryFilter], () => {
  page.value = 1;
});
```

- [ ] **Step 2: Добавить кнопку «Категории» в шапку**

In the `<AppPageHeader>` `#actions` template, add before the «Новая страница» button:

```vue
        <UButton
          variant="outline"
          icon="i-solar-folder-with-files-linear"
          @click="categoriesModalOpen = true"
        >
          Категории
        </UButton>
```

- [ ] **Step 3: Добавить фильтр по категории**

In the filter row (`<div class="mb-4 flex items-center gap-2">`), add after the status `USelect`:

```vue
      <USelect v-model="categoryFilter" :items="categoryFilterItems" placeholder="Все категории" size="sm" class="max-w-[200px]" />
```

- [ ] **Step 4: Заменить бейдж проекта на бейдж категории**

Replace:
```vue
              <AppStatusPill v-if="item.project" tone="info" :label="item.project.name" />
```
with:
```vue
              <AppStatusPill v-if="item.category" tone="neutral" :label="item.category.title" />
```

- [ ] **Step 5: Подключить модалку**

Before the closing `</PageContainer>` in the template, add:

```vue
    <PageCategoriesModal v-model:open="categoriesModalOpen" />
```

- [ ] **Step 6: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 7: Ручная проверка**

Run: `pnpm dev:admin`, открыть `/pages`.
Expected: фильтр «Все категории» работает, бейдж категории на строках; кнопка «Категории» открывает модалку — создание/переименование/порядок/удаление работают, счётчик «N стр.» корректен, удаление категории не удаляет страницы.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/app/pages/pages/index.vue
git commit -m "feat(admin): фильтр и управление категориями в списке страниц (#63)"
```

---

## Task 9: Удалить вкладку «На сайте» из проекта

**Files:**
- Modify: `apps/admin/app/pages/projects/[id].vue:34-54`
- Delete: `apps/admin/app/pages/projects/[id]/website.vue`

- [ ] **Step 1: Убрать вкладку из массива `tabs`**

In `apps/admin/app/pages/projects/[id].vue`, delete the line:
```ts
  { label: "На сайте", to: `/projects/${id.value}/website` },
```

- [ ] **Step 2: Поправить индексы в `activeTabIdx`**

Replace the whole `activeTabIdx` computed with the re-indexed version (website removed; progress 6→5, infrastructure 7→6):

```ts
const activeTabIdx = computed(() => {
  if (route.path.includes("/infrastructure")) return 6;
  if (route.path.includes("/progress")) return 5;
  if (route.path.includes("/apartments")) return 4;
  if (route.path.includes("/layouts")) return 3;
  if (route.path.includes("/buildings")) return 2;
  if (route.path.includes("/checkerboard")) return 1;
  return 0;
});
```

- [ ] **Step 3: Удалить файл вкладки**

```bash
git rm apps/admin/app/pages/projects/[id]/website.vue
```

- [ ] **Step 4: Проверить отсутствие мёртвых ссылок**

Run: `grep -rn "projectId\|\.project\b\|website" apps/admin/app/pages/pages apps/web/app/pages packages/api/src/routers/pages.ts packages/api/src/routers/public/pages.ts`
Expected: никаких упоминаний page→project (ссылки на `projects.list`/`project.id` в других контекстах — норм).

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 5: Ручная проверка**

Run: `pnpm dev:admin`, открыть проект `/projects/{id}`.
Expected: вкладки «Информация / Шахматка / Дома / Планировки / Квартиры / Ход строительства / Инфраструктура» — без «На сайте»; активная вкладка подсвечивается корректно на каждой странице.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/pages/projects/[id].vue
git commit -m "refactor(admin): убрать вкладку «На сайте» из проекта (#63)"
```

---

## Финальная верификация

- [ ] **Полная проверка типов и сборки**

Run: `pnpm check-types`
Expected: PASS по всему монорепо.

- [ ] **Smoke-тест полного флоу**

Run: `pnpm dev:admin` (+ при необходимости `pnpm dev:server`).
Сценарий: создать категорию → создать страницу с этой категорией → отфильтровать список по категории → переименовать категорию (бейдж обновился) → удалить категорию (страница осталась, бейдж снят) → открыть проект (нет вкладки «На сайте»).

- [ ] **Обновить issue**

```bash
gh issue comment 63 --body "Реализовано по плану docs/superpowers/plans/2026-06-13-page-categories.md. Готово к ревью."
```
