# Вынос SEO в раздел + пункты меню сайта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести SEO из общей страницы настроек сайта в отдельный раздел `/sites/[id]/seo` и добавить прямые пункты «SEO» и «Настройки» в подменю сайта.

**Architecture:** `apps/admin/app/pages/sites/[id].vue` разбивается на каталог `sites/[id]/` (`settings.vue`, `seo.vue`, `index.vue`-редирект). Обе страницы грузят сайт по `:id` и сохраняют через `sites.update` (поверхностный merge `settings` → каждая шлёт свой срез). В `AppSidebar.vue` под контент-пунктами каждого сайта добавляются admin-only `NuxtLink` на per-id роуты.

**Tech Stack:** Nuxt 4 SPA (file-based routing, auto-imports), @nuxt/ui v4, oRPC + vue-query.

**Спек:** [docs/superpowers/specs/2026-06-13-seo-settings-nav-design.md](../specs/2026-06-13-seo-settings-nav-design.md), issue [#61](https://github.com/alshchetinin/zhk-starter/issues/61), ветка `feat/61-seo-settings-nav`.

**Контекст для исполнителя (прочитать перед стартом):**
- Админка (`apps/admin`) — Nuxt 4. Компоненты (`PageContainer`, `AppPageHeader`, `AppDataCard`, `ImageUpload`, `SocialLinksEditor`) и утилиты (`randomPassword`, `useToast`, `useRoute`, `navigateTo`) авто-импортируются.
- У админки **нет** `check-types` и компонентных тестов. Проверка — запуск dev-сервера и отсутствие ошибок компиляции Vue/Vite в логе + ручной прогон.
- Postgres поднят (docker `zhk-starter-postgres`). Порты 3000 (server) и 3002 (admin) могут быть заняты уже запущенным инстансом пользователя — тогда стартовать dev на свободном порту (`PORT=… pnpm dev:admin`) только для проверки компиляции, либо полагаться на HMR в открытом инстансе.
- Nuxt file-routing: `pages/sites/[id]/index.vue` → `/sites/:id`, `settings.vue` → `/sites/:id/settings`, `seo.vue` → `/sites/:id/seo`. Удаление `pages/sites/[id].vue` обязательно (иначе конфликт маршрута с `[id]/index.vue`).
- `sites.update` мержит `settings` поверхностно: `{ ...existing.settings, ...input.settings }`. Ключи верхнего уровня: `contactsHeaderIds`, `contactsFooterIds`, `analytics`, `seo`. Поэтому страница, шлющая только `{ seo }`, не затирает контакты/аналитику, и наоборот.
- **Баг, который чиним попутно:** в текущем `sites/[id].vue` селект «Контакт для телефона и адреса» использует `orgContactItems` с пунктом `{ value: "" }`. Reka UI (`ComboboxItem`/`SelectItem`) бросает ошибку на пустую строку — дропдаун падает. В новом `seo.vue` селект пишем **исправленным**: `:items="contactItems"` (без sentinel) + проп `clear`. Ветка `fix/60-seo-org-contact-select` после этого становится не нужна.

---

### Task 1: Разбить страницу сайта на settings / seo / index

**Files:**
- Rename: `apps/admin/app/pages/sites/[id].vue` → `apps/admin/app/pages/sites/[id]/settings.vue`
- Modify: `apps/admin/app/pages/sites/[id]/settings.vue` (убрать SEO)
- Create: `apps/admin/app/pages/sites/[id]/index.vue`
- Create: `apps/admin/app/pages/sites/[id]/seo.vue`

- [ ] **Step 1: Перенести файл через git mv (сохранить историю)**

```bash
cd /Users/alex/project/zhk-starter
git mv "apps/admin/app/pages/sites/[id].vue" "apps/admin/app/pages/sites/[id]/settings.vue"
```

- [ ] **Step 2: Убрать SEO-поля из `form` в settings.vue**

Удалить из объекта `form = ref({ ... })` блок SEO-полей (12 строк, идут после `metrikaAccurateBounce: true,`):

```ts
  seoDefaultTitle: "",
  seoTitleSuffix: "",
  seoDefaultDescription: "",
  seoDefaultOgImage: null as string | null,
  seoFavicon: null as string | null,
  seoIndexingEnabled: true,
  seoYandexVerification: "",
  seoGoogleVerification: "",
  seoOrgName: "",
  seoOrgLegalName: "",
  seoOrgLogo: null as string | null,
  seoOrgContactId: "",
```

- [ ] **Step 3: Убрать SEO из `watchEffect` в settings.vue**

Удалить строку:

```ts
    const seo = data.value.settings?.seo;
```

и блок SEO-маппинга внутри `form.value = { ... }` (12 строк после `metrikaAccurateBounce: ym?.accurateTrackBounce ?? true,`):

```ts
      seoDefaultTitle: seo?.defaultTitle ?? "",
      seoTitleSuffix: seo?.titleSuffix ?? "",
      seoDefaultDescription: seo?.defaultDescription ?? "",
      seoDefaultOgImage: seo?.defaultOgImage ?? null,
      seoFavicon: seo?.favicon ?? null,
      seoIndexingEnabled: seo?.indexingEnabled ?? true,
      seoYandexVerification: seo?.yandexVerification ?? "",
      seoGoogleVerification: seo?.googleVerification ?? "",
      seoOrgName: seo?.organization?.name ?? "",
      seoOrgLegalName: seo?.organization?.legalName ?? "",
      seoOrgLogo: seo?.organization?.logo ?? null,
      seoOrgContactId: seo?.organization?.contactId ?? "",
```

- [ ] **Step 4: Убрать `orgContactItems` из settings.vue**

Удалить computed (он нужен только SEO-селекту):

```ts
const orgContactItems = computed(() => [
  { label: "Авто — первый контакт футера", value: "" },
  ...contactItems.value,
]);
```

(Оставить `contactItems` — он используется в карточке «Контакты на сайте».)

- [ ] **Step 5: Убрать SEO из мутации в settings.vue**

В `updateMutation.mutationFn` внутри `settings: { ... }` удалить блок `seo: { ... }` (после `analytics: { yandexMetrika },`):

```ts
        seo: {
          defaultTitle: form.value.seoDefaultTitle.trim() || undefined,
          titleSuffix: form.value.seoTitleSuffix.trim() || undefined,
          defaultDescription: form.value.seoDefaultDescription.trim() || undefined,
          defaultOgImage: form.value.seoDefaultOgImage || undefined,
          favicon: form.value.seoFavicon || undefined,
          indexingEnabled: form.value.seoIndexingEnabled,
          yandexVerification: form.value.seoYandexVerification.trim() || undefined,
          googleVerification: form.value.seoGoogleVerification.trim() || undefined,
          organization: {
            name: form.value.seoOrgName.trim() || undefined,
            legalName: form.value.seoOrgLegalName.trim() || undefined,
            logo: form.value.seoOrgLogo || undefined,
            contactId: form.value.seoOrgContactId || undefined,
          },
        },
```

После удаления `settings` объект остаётся: `contactsHeaderIds`, `contactsFooterIds`, `analytics: { yandexMetrika }`.

- [ ] **Step 6: Убрать SEO-карточку из шаблона settings.vue**

Удалить весь блок `<AppDataCard title="SEO"> … </AppDataCard>` (от строки `<AppDataCard title="SEO">` до её закрывающего тега, перед `<AppDataCard title="Яндекс.Метрика">`). Точное начало и конец блока:

```vue
        <AppDataCard title="SEO">
          <div class="space-y-3">
            <UFormField
              label="Title по умолчанию"
              description="Для главной и страниц без своего meta title"
            >
              <UInput v-model="form.seoDefaultTitle" size="sm" />
            </UFormField>
```
… (вся карточка целиком) …
```vue
              </UFormField>
            </div>
          </div>
        </AppDataCard>
```

Удалять от строки `<AppDataCard title="SEO">` до её закрывающего `</AppDataCard>` включительно (блок стоит между карточками «Контакты на сайте» и «Яндекс.Метрика»). После удаления «Контакты на сайте» соседствует напрямую с «Яндекс.Метрика». Никакие SEO-идентификаторы (`form.seo*`, `orgContactItems`) в settings.vue больше не встречаются.

- [ ] **Step 7: Создать `apps/admin/app/pages/sites/[id]/index.vue` (редирект)**

```vue
<script setup lang="ts">
const route = useRoute();
await navigateTo(`/sites/${route.params.id}/settings`, { replace: true });
</script>

<template>
  <div />
</template>
```

- [ ] **Step 8: Создать `apps/admin/app/pages/sites/[id]/seo.vue`**

```vue
<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

useHead({
  title: computed(() => (data.value ? `SEO — ${data.value.name}` : "SEO")),
});

const { data: siteContacts } = useQuery(
  computed(() =>
    $orpc.contacts.listBySite.queryOptions({ input: { siteId: id.value } }),
  ),
);

const form = ref({
  seoDefaultTitle: "",
  seoTitleSuffix: "",
  seoDefaultDescription: "",
  seoDefaultOgImage: null as string | null,
  seoFavicon: null as string | null,
  seoIndexingEnabled: true,
  seoYandexVerification: "",
  seoGoogleVerification: "",
  seoOrgName: "",
  seoOrgLegalName: "",
  seoOrgLogo: null as string | null,
  seoOrgContactId: "",
});

watchEffect(() => {
  if (data.value) {
    const seo = data.value.settings?.seo;
    form.value = {
      seoDefaultTitle: seo?.defaultTitle ?? "",
      seoTitleSuffix: seo?.titleSuffix ?? "",
      seoDefaultDescription: seo?.defaultDescription ?? "",
      seoDefaultOgImage: seo?.defaultOgImage ?? null,
      seoFavicon: seo?.favicon ?? null,
      seoIndexingEnabled: seo?.indexingEnabled ?? true,
      seoYandexVerification: seo?.yandexVerification ?? "",
      seoGoogleVerification: seo?.googleVerification ?? "",
      seoOrgName: seo?.organization?.name ?? "",
      seoOrgLegalName: seo?.organization?.legalName ?? "",
      seoOrgLogo: seo?.organization?.logo ?? null,
      seoOrgContactId: seo?.organization?.contactId ?? "",
    };
  }
});

const contactItems = computed(() =>
  (siteContacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.update({
      id: id.value,
      settings: {
        seo: {
          defaultTitle: form.value.seoDefaultTitle.trim() || undefined,
          titleSuffix: form.value.seoTitleSuffix.trim() || undefined,
          defaultDescription: form.value.seoDefaultDescription.trim() || undefined,
          defaultOgImage: form.value.seoDefaultOgImage || undefined,
          favicon: form.value.seoFavicon || undefined,
          indexingEnabled: form.value.seoIndexingEnabled,
          yandexVerification: form.value.seoYandexVerification.trim() || undefined,
          googleVerification: form.value.seoGoogleVerification.trim() || undefined,
          organization: {
            name: form.value.seoOrgName.trim() || undefined,
            legalName: form.value.seoOrgLegalName.trim() || undefined,
            logo: form.value.seoOrgLogo || undefined,
            contactId: form.value.seoOrgContactId || undefined,
          },
        },
      },
    }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => toast.add({ title: "Ошибка сохранения", color: "error" }),
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="data">
      <AppPageHeader
        title="SEO"
        :back="`/sites/${id}/settings`"
        :crumbs="[
          { label: 'Сайты', to: '/sites' },
          { label: data.name ?? 'Сайт', to: `/sites/${id}/settings` },
          { label: 'SEO' },
        ]"
      />

      <div class="max-w-2xl space-y-3">
        <AppDataCard title="SEO">
          <div class="space-y-3">
            <UFormField
              label="Title по умолчанию"
              description="Для главной и страниц без своего meta title"
            >
              <UInput v-model="form.seoDefaultTitle" size="sm" />
            </UFormField>
            <UFormField
              label="Суффикс title"
              description="Добавляется ко всем заголовкам страниц"
            >
              <UInput
                v-model="form.seoTitleSuffix"
                placeholder="— ЖК Новый Горизонт"
                size="sm"
              />
            </UFormField>
            <UFormField label="Description по умолчанию">
              <UTextarea v-model="form.seoDefaultDescription" :rows="2" size="sm" />
            </UFormField>
            <UFormField
              label="OG-изображение по умолчанию"
              description="Для соцсетей, когда у страницы нет своего"
            >
              <ImageUpload v-model="form.seoDefaultOgImage" folder="uploads/seo" />
            </UFormField>
            <UFormField label="Favicon" description="Квадратная картинка, PNG или SVG">
              <ImageUpload v-model="form.seoFavicon" folder="uploads/seo" />
            </UFormField>
            <UFormField
              label="Разрешить индексацию"
              description="Сайт под паролем или неактивный закрыт от поисковиков независимо от переключателя"
            >
              <USwitch v-model="form.seoIndexingEnabled" />
            </UFormField>
            <UFormField label="Яндекс.Вебмастер" hint="yandex-verification">
              <UInput v-model="form.seoYandexVerification" size="sm" />
            </UFormField>
            <UFormField label="Google Search Console" hint="google-site-verification">
              <UInput v-model="form.seoGoogleVerification" size="sm" />
            </UFormField>

            <div class="space-y-3 border-t border-(--ui-border) pt-3">
              <div class="text-xs font-medium uppercase tracking-wide text-(--ui-text-dimmed)">
                Организация (schema.org)
              </div>
              <UFormField label="Название" description="По умолчанию — название сайта">
                <UInput v-model="form.seoOrgName" size="sm" />
              </UFormField>
              <UFormField label="Юридическое название">
                <UInput v-model="form.seoOrgLegalName" size="sm" />
              </UFormField>
              <UFormField label="Логотип">
                <ImageUpload v-model="form.seoOrgLogo" folder="uploads/seo" />
              </UFormField>
              <UFormField
                label="Контакт для телефона и адреса"
                description="Телефон и адрес организации в разметке schema.org"
              >
                <USelectMenu
                  v-model="form.seoOrgContactId"
                  :items="contactItems"
                  value-key="value"
                  clear
                  placeholder="Авто — первый контакт футера"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-solar-diskette-linear"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
```

- [ ] **Step 9: Проверить компиляцию вживую**

Если порт 3002 свободен: `pnpm dev:admin` (и `pnpm dev:server`, если нужен), дождаться сборки. Если занят инстансом пользователя — поднять на свободном порту: `PORT=3012 pnpm --filter zhk-admin dev` (только для проверки компиляции).

Проверить в логе dev-сервера, что **нет** ошибок Vue/Vite (`[vite]`, `Failed to compile`, `Cannot find`). Smoke: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/sites` → `200`.
Expected: сборка без ошибок; три файла-страницы распознаны Nuxt (в логе нет жалоб на маршруты). Остановить поднятый для проверки dev-сервер.

- [ ] **Step 10: Commit**

```bash
git add "apps/admin/app/pages/sites/[id]"
git commit -m "refactor(admin): вынести SEO в /sites/[id]/seo, разбить настройки сайта (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Пункты «SEO» и «Настройки» в подменю сайта

**Files:**
- Modify: `apps/admin/app/components/AppSidebar.vue`

- [ ] **Step 1: Добавить admin-only ссылки в подменю сайта**

В `AppSidebar.vue` внутри `<nav v-if="expandedSites[site.id] && !isCollapsed" …>` сразу **после** закрывающего `</button>` цикла `v-for="item in visibleContentItems"` и **перед** закрывающим `</nav>` добавить:

```vue
            <template v-if="isAdmin">
              <div class="my-1 ml-2 border-t border-(--ui-border)" />
              <NuxtLink
                :to="`/sites/${site.id}/seo`"
                class="flex items-center gap-2 px-2 py-1 rounded-md w-full text-left text-[12.5px] transition-colors"
                :class="isActive(`/sites/${site.id}/seo`)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
              >
                <UIcon name="i-solar-magnifer-zoom-in-linear" class="size-3.5 shrink-0 opacity-70" />
                <span>SEO</span>
              </NuxtLink>
              <NuxtLink
                :to="`/sites/${site.id}/settings`"
                class="flex items-center gap-2 px-2 py-1 rounded-md w-full text-left text-[12.5px] transition-colors"
                :class="isActive(`/sites/${site.id}/settings`)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
              >
                <UIcon name="i-solar-settings-linear" class="size-3.5 shrink-0 opacity-70" />
                <span>Настройки</span>
              </NuxtLink>
            </template>
```

`isAdmin` уже доступен в компоненте (`const { isAdmin, canAccessSection } = useCurrentUser();`). `isActive` уже импортирован из `useNavigation()`.

- [ ] **Step 2: Проверить вживую**

При запущенном dev-admin (или через HMR в инстансе пользователя): развернуть сайт в сайдбаре — под контент-пунктами должны появиться разделитель, «SEO» и «Настройки» (у админа). Клик по «Настройки» → `/sites/{id}/settings`; «SEO» → `/sites/{id}/seo`; активный пункт подсвечивается; переключения активного сайта/перезагрузки нет. В логе dev-сервера нет ошибок компиляции.
Expected: оба пункта видны и ведут на per-id страницы.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/components/AppSidebar.vue
git commit -m "feat(admin): пункты SEO и Настройки в подменю сайта (#61)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Сквозная проверка и закрытие задачи

**Files:** —

- [ ] **Step 1: Прогнать общий тест-сьют (регрессий нет)**

```bash
pnpm test
```
Expected: 144 passed (изменения только в admin .vue — тесты не затрагиваются, но прогон подтверждает отсутствие поломок импорта в shared-пакетах).

- [ ] **Step 2: Сквозная живая проверка**

При работающем admin (порт пользователя через HMR, либо свежий dev):
1. `/sites/{id}` → редиректит на `/sites/{id}/settings`.
2. Страница «Настройки»: карточки Основные/Доступ/Контакты/Метрика на месте, SEO-карточки **нет**; сохранение Метрики/контактов работает.
3. Страница «SEO»: все SEO-поля на месте; селект «Контакт для телефона и адреса» **открывается без ошибки** (раскрыть дропдаун — список контактов; выбрать контакт; крестик `clear` сбрасывает к «Авто»); сохранение работает; повторная загрузка возвращает значения.
4. Сохранение на SEO не затирает контакты/Метрику и наоборот (проверить: сохранить SEO, затем открыть Настройки — контакты на месте).
5. В подменю сайта видны «SEO» и «Настройки», ведут на правильные страницы.
Expected: все пункты проходят, консоль браузера без ошибок Reka/`ComboboxItem`.

- [ ] **Step 3: Комментарий к issue**

```bash
gh issue comment 61 --body "Реализовано в ветке feat/61-seo-settings-nav: страница сайта разбита на /sites/[id]/settings и /sites/[id]/seo (+ index-редирект), в подменю сайта добавлены admin-only пункты «SEO» и «Настройки» (прямой переход, per-id). Попутно исправлен селект контакта организации (sentinel value:\"\" → :items + clear), ветка fix/60-seo-org-contact-select больше не нужна."
```

- [ ] **Step 4 (после мержа, опционально): удалить избыточную ветку фикса**

После того как ветка `feat/61` будет влита, локальная `fix/60-seo-org-contact-select` несёт правку файла, которого больше нет (`sites/[id].vue` удалён), и её содержимое субсумировано в `seo.vue`. Удалить можно командой `git branch -D fix/60-seo-org-contact-select` — **только с подтверждения пользователя** (не выполнять автоматически).
