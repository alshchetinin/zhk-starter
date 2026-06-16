# Архивация сайтов с восстановлением — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить небезопасное жёсткое удаление сайта на архивацию с восстановлением (архивный сайт невидим в вебе и убран из основного списка), оставив необратимое удаление только из архива.

**Architecture:** Новое nullable-поле `sites.archivedAt` ортогонально существующему `isActive`. Архив прячет сайт из выборки `resolveSiteFromHost` (невидим в вебе) и из основного списка админки (отдельная страница «Архив»). Необратимое удаление чинится декларативно — `onDelete: "cascade"` на всех FK → `sites.id`, тогда один `DELETE` строки сайта сносит весь контент. Чистая логика guard-ов вынесена в тестируемый модуль; БД-каскад проверяется на дев-БД и в браузере.

**Tech Stack:** Drizzle ORM + PostgreSQL, oRPC + Zod, Nuxt 4 + @nuxt/ui v4 (admin), vitest.

**Спека:** [`docs/superpowers/specs/2026-06-17-site-archiving-design.md`](../specs/2026-06-17-site-archiving-design.md) · **Issue:** [#74](https://github.com/alshchetinin/zhk-starter/issues/74)

---

## File Structure

- `packages/db/src/schema/sites.ts` — добавить поле `archivedAt`.
- `packages/db/src/schema/*.ts` (26 файлов, 27 ссылок) — `onDelete: "cascade"` на FK → `sites.id`.
- `packages/db/src/migrations/*.sql` — сгенерированная миграция (артефакт).
- `packages/api/src/shared/site-archive.ts` (новый) — чистые guard-функции.
- `packages/api/src/shared/__tests__/site-archive.test.ts` (новый) — юнит-тесты guard-ов.
- `packages/api/src/routers/sites.ts` — `list` (фильтр), `listArchived`, `archive`, `restore`, `deletePermanent`, сообщение в `create`.
- `packages/api/src/utils/resolve-site.ts` — исключить архивные.
- `apps/admin/app/pages/sites/index.vue` — действие «В архив» + ссылка на «Архив».
- `apps/admin/app/pages/sites/archive.vue` (новый) — список архива, restore, удалить навсегда.

---

## Task 1: Схема БД — `archivedAt` + каскады FK + миграция

**Files:**
- Modify: `packages/db/src/schema/sites.ts:73-92`
- Modify: `packages/db/src/schema/*.ts` (все FK → `sites.id` без cascade)
- Create: `packages/db/src/migrations/<generated>.sql`

- [ ] **Step 1: Добавить поле `archivedAt` в таблицу `sites`**

В [`packages/db/src/schema/sites.ts`](../../../packages/db/src/schema/sites.ts) внутри `pgTable("sites", {...})`, после строки `customDomain: ...` (строка 83) и перед `settings:` добавить:

```ts
  archivedAt: timestamp("archived_at", { withTimezone: true }),
```

`timestamp` уже импортирован (строка 2). Nullable по умолчанию (нет `.notNull()`), default `null`.

- [ ] **Step 2: Проставить `onDelete: "cascade"` на все FK → `sites.id`**

Одной командой по всем файлам схемы, кроме `sites.ts` (формат ссылок единообразный — `=> sites.id),`):

```bash
cd /Users/alex/project/zhk-starter
find packages/db/src/schema -name '*.ts' ! -name 'sites.ts' \
  -exec sed -i '' 's/=> sites\.id),/=> sites.id, { onDelete: "cascade" }),/g' {} +
```

- [ ] **Step 3: Проверить, что не осталось FK на sites без cascade**

```bash
grep -rn "=> sites.id)" packages/db/src/schema
```

Expected: пусто (все ссылки теперь `=> sites.id, { onDelete: "cascade" })`). Дополнительно — счётчик cascade-ссылок:

```bash
grep -rc "=> sites.id, { onDelete: \"cascade\" }" packages/db/src/schema/*.ts | grep -v ':0' | wc -l
```
Expected: 30 файлов (27 новых + content-versions/form-receivers/modals/social-links уже были; floors.ts содержит 2 ссылки).

- [ ] **Step 4: Сгенерировать миграцию Drizzle**

```bash
pnpm --filter @zhk/db db:generate
```
Expected: создан новый файл в `packages/db/src/migrations/`. Имя вида `0002_<random>.sql`.

- [ ] **Step 5: Проверить содержимое миграции**

```bash
cat $(ls -t packages/db/src/migrations/*.sql | head -1)
```
Expected: `ALTER TABLE "sites" ADD COLUMN "archived_at" timestamp with time zone;` и серия `ALTER TABLE ... DROP CONSTRAINT ... ` / `ADD CONSTRAINT ... ON DELETE cascade` для дочерних таблиц. Если ALTER на `archived_at` отсутствует — поле не подхватилось, вернуться к Step 1.

- [ ] **Step 6: Применить миграцию к дев-БД**

Дев-postgres поднят в docker (`zhk-starter-postgres`, БД `zhk_starter`); `DATABASE_URL` берётся из `apps/server/.env`.

```bash
pnpm --filter @zhk/db db:migrate
```
Expected: миграция применена без ошибок.

- [ ] **Step 7: Проверить БД-каскад на реальной БД (raw SQL, rollback-транзакция)**

Доказываем, что удаление сайта с контентом не падает на FK и сносит дочерние строки. Подставь имя контейнера/пользователя из своего окружения (БД `zhk_starter`).

```bash
docker exec -i zhk-starter-postgres psql -U postgres -d zhk_starter <<'SQL'
BEGIN;
-- временный сайт с одной страницей и одним проектом
INSERT INTO sites (id, slug, name) VALUES ('t_arch_test', 'arch-test-xyz', 'Arch Test');
INSERT INTO pages (id, site_id, slug, title) VALUES ('t_arch_page', 't_arch_test', 'p', 'P');
INSERT INTO projects (id, site_id, name, slug) VALUES ('t_arch_proj', 't_arch_test', 'Proj', 'proj-x');
-- удаление сайта должно каскадно снести страницу и проект
DELETE FROM sites WHERE id = 't_arch_test';
SELECT
  (SELECT count(*) FROM pages WHERE site_id = 't_arch_test') AS pages_left,
  (SELECT count(*) FROM projects WHERE site_id = 't_arch_test') AS projects_left;
ROLLBACK;
SQL
```
Expected: команда завершается без ошибки FK, `pages_left = 0`, `projects_left = 0`. (Если у `pages`/`projects` есть `NOT NULL` на колонках, которых нет в INSERT — добавь их в VALUES; цель — просто получить по строке-ребёнку.)

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema packages/db/src/migrations
git commit -m "feat(db): поле sites.archivedAt + каскадное удаление дочерних таблиц (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Чистые guard-функции архивации + тесты (TDD)

**Files:**
- Create: `packages/api/src/shared/site-archive.ts`
- Test: `packages/api/src/shared/__tests__/site-archive.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/api/src/shared/__tests__/site-archive.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSiteArchived, canArchiveSite, canRestoreSite } from "../site-archive";

describe("isSiteArchived", () => {
  it("archivedAt задан → в архиве", () => {
    expect(isSiteArchived({ archivedAt: new Date() })).toBe(true);
    expect(isSiteArchived({ archivedAt: "2026-06-17T00:00:00Z" })).toBe(true);
  });
  it("archivedAt null → не в архиве", () => {
    expect(isSiteArchived({ archivedAt: null })).toBe(false);
  });
});

describe("canArchiveSite", () => {
  it("обычный активный сайт можно архивировать", () => {
    expect(canArchiveSite({ isPrimary: false, archivedAt: null })).toBe(true);
  });
  it("главный сайт архивировать нельзя", () => {
    expect(canArchiveSite({ isPrimary: true, archivedAt: null })).toBe(false);
  });
  it("уже архивный сайт повторно архивировать нельзя", () => {
    expect(canArchiveSite({ isPrimary: false, archivedAt: new Date() })).toBe(false);
  });
});

describe("canRestoreSite", () => {
  it("архивный сайт можно восстановить", () => {
    expect(canRestoreSite({ archivedAt: new Date() })).toBe(true);
  });
  it("не-архивный сайт восстанавливать нечего", () => {
    expect(canRestoreSite({ archivedAt: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

```bash
pnpm test site-archive
```
Expected: FAIL — `Failed to resolve import "../site-archive"`.

- [ ] **Step 3: Реализовать модуль**

Создать `packages/api/src/shared/site-archive.ts`:

```ts
/**
 * Чистая логика состояния архивации сайта. Без зависимостей от БД/oRPC —
 * хендлеры роутера резолвят сайт и применяют эти предикаты.
 */

/** Поля сайта, относящиеся к архивации. */
export interface SiteArchiveFields {
  isPrimary: boolean;
  archivedAt: Date | string | null;
}

/** Сайт в архиве (archivedAt проставлен). */
export function isSiteArchived(site: { archivedAt: Date | string | null }): boolean {
  return site.archivedAt != null;
}

/** Можно ли архивировать: не главный и ещё не в архиве. */
export function canArchiveSite(site: SiteArchiveFields): boolean {
  return !site.isPrimary && !isSiteArchived(site);
}

/** Можно ли восстановить: сайт должен быть в архиве. */
export function canRestoreSite(site: { archivedAt: Date | string | null }): boolean {
  return isSiteArchived(site);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

```bash
pnpm test site-archive
```
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/shared/site-archive.ts packages/api/src/shared/__tests__/site-archive.test.ts
git commit -m "feat(api): чистые guard-функции архивации сайта + тесты (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: oRPC роутер `sites` — list/listArchived/archive/restore/deletePermanent

**Files:**
- Modify: `packages/api/src/routers/sites.ts`

- [ ] **Step 1: Добавить импорты drizzle и guard-функций**

В [`packages/api/src/routers/sites.ts`](../../../packages/api/src/routers/sites.ts) строку 4 заменить:

```ts
import { and, eq, ne } from "drizzle-orm";
```
на:
```ts
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
```

После строки 10 (`import { siteNavigationSchema } ...`) добавить:

```ts
import { isSiteArchived, canArchiveSite, canRestoreSite } from "../shared/site-archive";
```

- [ ] **Step 2: `list` — отдавать только не-архивные; добавить `listArchived`**

Заменить блок `list` (строки 67-71) на:

```ts
  list: protectedProcedure.handler(async () => {
    return db.query.sites.findMany({
      where: isNull(sites.archivedAt),
      orderBy: (s, { desc, asc }) => [desc(s.isPrimary), asc(s.name)],
    });
  }),

  listArchived: protectedProcedure.handler(async () => {
    return db.query.sites.findMany({
      where: isNotNull(sites.archivedAt),
      orderBy: (s, { desc }) => [desc(s.archivedAt)],
    });
  }),
```

- [ ] **Step 3: Сообщение `create` про slug, занятый архивным сайтом**

В `create` заменить блок выборки existing (строки 93-100) на:

```ts
      const existing = await db
        .select({ id: sites.id, archivedAt: sites.archivedAt })
        .from(sites)
        .where(eq(sites.slug, input.slug))
        .limit(1);
      if (existing[0]) {
        throw new ORPCError("CONFLICT", {
          message: existing[0].archivedAt
            ? "Slug занят сайтом в архиве — восстановите его или удалите навсегда"
            : "Slug already in use",
        });
      }
```

- [ ] **Step 4: Заменить `delete` на `archive` + `restore` + `deletePermanent`**

Заменить весь блок `delete` (строки 193-203) на:

```ts
  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const site = await db.query.sites.findFirst({ where: eq(sites.id, input.id) });
      if (!site) throw new ORPCError("NOT_FOUND");
      if (!canArchiveSite(site)) {
        throw new ORPCError("BAD_REQUEST", {
          message: site.isPrimary
            ? "Нельзя архивировать главный сайт"
            : "Сайт уже в архиве",
        });
      }
      const [updated] = await db
        .update(sites)
        .set({ archivedAt: new Date() })
        .where(eq(sites.id, input.id))
        .returning();
      return updated;
    }),

  restore: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const site = await db.query.sites.findFirst({ where: eq(sites.id, input.id) });
      if (!site) throw new ORPCError("NOT_FOUND");
      if (!canRestoreSite(site)) {
        throw new ORPCError("BAD_REQUEST", { message: "Сайт не в архиве" });
      }
      const [updated] = await db
        .update(sites)
        .set({ archivedAt: null, isActive: false })
        .where(eq(sites.id, input.id))
        .returning();
      return updated;
    }),

  deletePermanent: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const site = await db.query.sites.findFirst({ where: eq(sites.id, input.id) });
      if (!site) throw new ORPCError("NOT_FOUND");
      if (site.isPrimary) {
        throw new ORPCError("BAD_REQUEST", { message: "Нельзя удалить главный сайт" });
      }
      if (!isSiteArchived(site)) {
        throw new ORPCError("BAD_REQUEST", { message: "Сначала отправьте сайт в архив" });
      }
      await db.delete(sites).where(eq(sites.id, input.id));
      return { success: true };
    }),
```

- [ ] **Step 5: Проверить типы**

```bash
pnpm --filter @zhk/api check-types
```
Expected: нет НОВЫХ ошибок. ⚠️ В репо есть 6 ПРЕД-СУЩЕСТВУЮЩИХ ошибок в `integration.ts`/`sections.ts`/`social-links.ts`/`sync.ts` — они не из этой задачи, игнорировать. Если появилась ошибка в `sites.ts` — исправить.

- [ ] **Step 6: Прогнать весь тест-набор (ничего не сломали)**

```bash
pnpm test
```
Expected: все тесты зелёные (включая 7 новых из Task 2).

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/sites.ts
git commit -m "feat(api): архивация сайта — list/listArchived/archive/restore/deletePermanent (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `resolveSiteFromHost` исключает архивные сайты

**Files:**
- Modify: `packages/api/src/utils/resolve-site.ts`

- [ ] **Step 1: Добавить фильтр `archivedAt IS NULL` в резолв**

В [`packages/api/src/utils/resolve-site.ts`](../../../packages/api/src/utils/resolve-site.ts) заменить импорт (строка 3):

```ts
import { eq, or } from "drizzle-orm";
```
на:
```ts
import { and, eq, isNull, or } from "drizzle-orm";
```

Заменить блок `match` (строки 19-25) на:

```ts
  const match = await db.query.sites.findFirst({
    where: and(
      isNull(sites.archivedAt),
      or(
        eq(sites.customDomain, hostname),
        subdomain ? eq(sites.slug, subdomain) : undefined,
      ),
    ),
  });
  if (match) return match;
```

Заменить `findPrimarySite` (строки 30-32) на:

```ts
function findPrimarySite() {
  return db.query.sites.findFirst({
    where: and(eq(sites.isPrimary, true), isNull(sites.archivedAt)),
  });
}
```

- [ ] **Step 2: Проверить типы**

```bash
pnpm --filter @zhk/api check-types
```
Expected: нет новых ошибок в `resolve-site.ts` (про пред-существующие — см. Task 3 Step 5).

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/utils/resolve-site.ts
git commit -m "feat(api): архивный сайт не резолвится по Host (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Админка — действие «В архив» в списке + ссылка на «Архив»

**Files:**
- Modify: `apps/admin/app/pages/sites/index.vue`

- [ ] **Step 1: Заменить delete-мутацию на archive + добавить состояние confirm**

В [`apps/admin/app/pages/sites/index.vue`](../../../apps/admin/app/pages/sites/index.vue) заменить `deleteMutation` (строки 36-42) на:

```ts
const archiveTarget = ref<{ id: string; name: string } | null>(null);
const archiveMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.archive({ id }),
  onSuccess: () => {
    toast.add({ title: "Сайт отправлен в архив", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    archiveTarget.value = null;
  },
  onError: () => {
    toast.add({ title: "Не удалось архивировать", color: "error" });
  },
});
```

- [ ] **Step 2: Добавить кнопку «Архив» в шапку страницы**

В блоке `<template #actions>` (строки 97-105) перед кнопкой «Новый сайт» добавить:

```vue
        <UButton
          to="/sites/archive"
          variant="outline"
          icon="i-solar-archive-linear"
        >
          Архив
        </UButton>
```

- [ ] **Step 3: Заменить кнопку «Удалить» на «В архив»**

Заменить кнопку удаления (строки 189-196) на:

```vue
            <UButton
              v-if="!item.isPrimary"
              variant="ghost"
              icon="i-solar-archive-down-linear"
              title="В архив"
              @click="archiveTarget = { id: item.id, name: item.name }"
            />
```

- [ ] **Step 4: Добавить модалку подтверждения архивации**

Перед закрывающим `</PageContainer>` (после модалки «Новый сайт», строка 287) добавить:

```vue
    <UModal
      :open="!!archiveTarget"
      title="Отправить сайт в архив?"
      @update:open="(v) => { if (!v) archiveTarget = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Сайт «{{ archiveTarget?.name }}» перестанет открываться в вебе и пропадёт
          из этого списка. Его можно восстановить из раздела «Архив».
        </p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" @click="archiveTarget = null">Отмена</UButton>
          <UButton
            color="warning"
            :loading="archiveMutation.isPending.value"
            @click="archiveMutation.mutate(archiveTarget!.id)"
          >
            В архив
          </UButton>
        </div>
      </template>
    </UModal>
```

- [ ] **Step 5: Проверить в браузере (preview)**

Запустить preview-стек админки (порт 3002) и web/server, опереться на существующую сессию админки. Открыть `/sites`:
- кнопка «Архив» видна в шапке;
- у непримарного сайта в действиях есть «В архив» (иконка рендерится — если пустая, заменить `i-solar-archive-down-linear` → `i-solar-archive-linear`);
- клик → модалка → «В архив» → тост, сайт пропал из списка.

Снять скриншот списка после архивации.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/pages/sites/index.vue
git commit -m "feat(admin): действие «В архив» в списке сайтов + ссылка на архив (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Админка — страница «Архив» (восстановление + удалить навсегда)

**Files:**
- Create: `apps/admin/app/pages/sites/archive.vue`

- [ ] **Step 1: Создать страницу архива**

Создать `apps/admin/app/pages/sites/archive.vue`:

```vue
<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery($orpc.sites.listArchived.queryOptions());

const restoreMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.restore({ id }),
  onSuccess: () => {
    toast.add({
      title: "Сайт восстановлен",
      description: "Он вернулся в список как скрытый — включите его, когда будет готов",
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => {
    toast.add({ title: "Не удалось восстановить", color: "error" });
  },
});

// удаление навсегда — с подтверждением вводом slug
const deleteTarget = ref<{ id: string; name: string; slug: string } | null>(null);
const deleteConfirm = ref("");
watch(deleteTarget, () => { deleteConfirm.value = ""; });
const deleteAllowed = computed(
  () => !!deleteTarget.value && deleteConfirm.value.trim() === deleteTarget.value.slug,
);

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.deletePermanent({ id }),
  onSuccess: () => {
    toast.add({ title: "Сайт удалён навсегда", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    deleteTarget.value = null;
  },
  onError: () => {
    toast.add({ title: "Не удалось удалить", color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Архив сайтов"
      subtitle="Сайты в архиве не открываются в вебе. Их можно восстановить или удалить навсегда."
    >
      <template #actions>
        <UButton to="/sites" variant="outline" icon="i-solar-arrow-left-linear">
          К сайтам
        </UButton>
      </template>
    </AppPageHeader>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="item in data"
          :key="item.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0"
          >
            <UIcon name="i-solar-archive-linear" class="size-5 text-(--ui-text-dimmed)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold truncate">{{ item.name }}</span>
              <AppStatusPill tone="neutral" label="В архиве" dot />
            </div>
            <div class="flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) mt-0.5">
              <span class="font-mono">{{ item.slug }}</span>
              <span v-if="item.customDomain" class="font-mono">· {{ item.customDomain }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              variant="ghost"
              icon="i-solar-restart-linear"
              title="Восстановить"
              :loading="restoreMutation.isPending.value"
              @click="restoreMutation.mutate(item.id)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-solar-trash-bin-trash-linear"
              title="Удалить навсегда"
              @click="deleteTarget = { id: item.id, name: item.name, slug: item.slug }"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-solar-archive-linear"
      title="Архив пуст"
      description="Сюда попадают сайты, отправленные в архив из списка сайтов."
    />

    <UModal
      :open="!!deleteTarget"
      title="Удалить сайт навсегда?"
      @update:open="(v) => { if (!v) deleteTarget = null }"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-(--ui-text-muted)">
            Действие необратимо. Будут безвозвратно удалены ВСЕ данные сайта
            «{{ deleteTarget?.name }}»: страницы, новости, проекты, каталог,
            контакты и т.д.
          </p>
          <UFormField :label="`Для подтверждения введите slug сайта: ${deleteTarget?.slug}`">
            <UInput v-model="deleteConfirm" :placeholder="deleteTarget?.slug" size="sm" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" @click="deleteTarget = null">Отмена</UButton>
          <UButton
            color="error"
            :loading="deleteMutation.isPending.value"
            :disabled="!deleteAllowed"
            @click="deleteMutation.mutate(deleteTarget!.id)"
          >
            Удалить навсегда
          </UButton>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
```

- [ ] **Step 2: Проверить в браузере (preview)**

На `/sites/archive`:
- архивированный в Task 5 сайт виден с пиллом «В архиве»;
- «Восстановить» → тост, сайт исчез из архива и вернулся в `/sites` как «Скрыт» (проверить, что `isActive=false` — пилл «Скрыт»);
- снова отправить сайт в архив (через `/sites`), вернуться в архив;
- «Удалить навсегда» → модалка; кнопка неактивна, пока slug введён неверно; ввести верный slug → удаление → тост, сайт исчез.

Снять скриншоты архива и модалки подтверждения.

⚠️ Иконки `i-solar-restart-linear` / `i-solar-archive-linear` / `i-solar-arrow-left-linear` — если какая-то не рендерится, подобрать существующую из `@iconify-json/solar` (`i-solar-refresh-linear`, `i-solar-box-linear`, `i-solar-alt-arrow-left-linear`).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/pages/sites/archive.vue
git commit -m "feat(admin): страница архива сайтов — восстановление и удаление навсегда (#74)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Сквозная проверка в вебе + финал

**Files:** —

- [ ] **Step 1: Проверить, что архивный сайт невидим в вебе**

С поднятым preview-стеком (web :3001, server :3000). Взять непримарный сайт со своим slug (например, дублировать сайт, дать slug `arch-web-test`). Открыть `http://arch-web-test.localhost:3001` — сайт отдаётся. Затем отправить его в архив через `/sites`. Снова открыть `http://arch-web-test.localhost:3001`:
- Expected: резолв падает на primary-фолбэк (отдаётся главный сайт, а не контент архивного). Контент архивного сайта не доступен по его поддомену.

Восстановить сайт, убедиться что по slug он снова доступен (после включения `isActive`, т.к. restore возвращает скрытым → web отдаст SITE_INACTIVE, пока не включить).

- [ ] **Step 2: Полный прогон тестов и типов**

```bash
pnpm test && pnpm check-types
```
Expected: тесты зелёные; в check-types только пред-существующие 6 ошибок (Task 3 Step 5), новых нет.

- [ ] **Step 3: Обновить память проекта**

Добавить в `MEMORY.md` строку-указатель про фичу архивации (ветка `feat/74-site-archiving`, issue #74): поле `sites.archivedAt`, каскады FK починены, `resolveSiteFromHost` исключает архивные, restore → скрытым, deletePermanent только из архива, страница `/sites/archive`. Держать строку короткой (<200 симв), детали — в этом плане/спеке.

- [ ] **Step 4: Финальная проверка готовности к merge**

Через skill `superpowers:finishing-a-development-branch` решить, как интегрировать (PR в main). Перед этим — самопроверка спекой: все требования покрыты (см. ниже).

---

## Self-Review (покрытие спеки)

- **Модель `archivedAt`** → Task 1 Step 1. ✅
- **`isActive` не трогаем** → нигде не меняется. ✅
- **`list` без архива + список архива** → Task 3 Step 2. ✅
- **`archive` (запрет primary)** → Task 2 (guard) + Task 3 Step 4. ✅
- **`restore` → скрытым (isActive=false)** → Task 3 Step 4 (`archivedAt: null, isActive: false`). ✅
- **`deletePermanent` только из архива + не primary** → Task 3 Step 4. ✅
- **Каскад FK (починка удаления)** → Task 1 Steps 2-3, верификация Step 7. ✅
- **`resolveSiteFromHost` исключает архивные** → Task 4 + проверка Task 7 Step 1. ✅
- **slug/домен заняты до окончательного удаления; сообщение в create** → Task 3 Step 3 (поведение уникальности — встроено в БД). ✅
- **Админка: «В архив» в списке** → Task 5. ✅
- **Админка: страница архива (restore + delete-forever с вводом slug)** → Task 6. ✅
- **Тесты guard-ов** → Task 2. ✅
- **Запрет на primary в archive и deletePermanent** → guard + хендлеры. ✅
