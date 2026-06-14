<script setup lang="ts">
import { TRACKING_EVENT_LIST } from "@zhk/api/shared/tracking";
import type { BlockFieldType } from "@zhk/api/shared/blocks";
import { blockFieldTypes } from "~/utils/block-schema";

// Таблица типов полей собирается из BLOCK_FIELD_TYPES (через blockFieldTypes,
// там же русские labels). Record по всем типам — TS заставит дополнить
// примечания при добавлении нового типа.
const fieldTypeEditors: Record<BlockFieldType, string> = {
  string: "UInput",
  text: "UTextarea",
  richtext: "UEditor",
  number: "UInput type=number",
  boolean: "USwitch",
  url: "UInput type=url",
  image: "ImageUpload",
  images: "GalleryUpload",
  strings: "TagInput",
  select: "USelect",
  project: "ProjectSelector",
  contacts: "ContactsSelector",
  repeater: "RepeaterField",
};

const fieldTypeNotes: Partial<Record<BlockFieldType, string>> = {
  richtext: "HTML; на сайте — v-html + prose-web",
  url: "пустая строка валидна",
  image: "необязательное → .nullable() в Zod; default у required — null",
  select: "требует options: string[]",
  project: "relation — хранит id проекта",
  contacts: "relation — хранит id контактов (string[])",
  repeater: "требует subFields[]; minItems / maxItems; вложенный repeater запрещён",
};

const sections = [
  { id: "blocks", label: "Блоки", icon: "i-solar-layers-minimalistic-linear" },
  { id: "collections", label: "Коллекции", icon: "i-solar-database-linear" },
  { id: "modals", label: "Модальные окна", icon: "i-solar-window-frame-linear" },
  { id: "images", label: "Изображения", icon: "i-solar-gallery-linear" },
  { id: "tracking", label: "Трекинг событий", icon: "i-solar-chart-2-linear" },
  { id: "security", label: "Безопасность", icon: "i-solar-shield-keyhole-linear" },
  { id: "observability", label: "Ошибки (GlitchTip)", icon: "i-solar-bug-minimalistic-linear" },
];

const rateLimitScopes = [
  { scope: "authSignIn", limit: "5 / 15 мин", fail: "closed", where: "вход в админку (better-auth)" },
  { scope: "siteUnlock", limit: "5 / 10 мин", fail: "closed", where: "пароль сайта" },
  { scope: "ticketCreate", limit: "5 / 10 мин", fail: "closed", where: "форма заявки (бёрст)" },
  { scope: "ticketCreateHourly", limit: "20 / час", fail: "closed", where: "форма заявки (часовой)" },
  { scope: "contactsGetByIds", limit: "30 / мин", fail: "open", where: "выборка контактов (+ max 100 id)" },
  { scope: "publicRead", limit: "120 / мин", fail: "open", where: "публичные списки/детали" },
  { scope: "honoCeiling", limit: "300 / мин", fail: "open", where: "общий потолок (любой маршрут)" },
];

const activeSection = ref("blocks");
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center gap-3">
      <UIcon name="i-solar-book-linear" class="size-6 text-(--ui-text-muted)" />
      <h1 class="text-2xl font-bold">Документация</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <aside class="space-y-1">
        <button
          v-for="s in sections"
          :key="s.id"
          class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors"
          :class="activeSection === s.id
            ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
            : 'text-(--ui-text-muted) hover:bg-(--ui-bg-muted)'"
          @click="activeSection = s.id"
        >
          <UIcon :name="s.icon" class="size-4" />
          {{ s.label }}
        </button>
      </aside>

      <article v-if="activeSection === 'blocks'" class="space-y-8 prose-docs">
        <section>
          <h2>Блоки</h2>
          <p>
            Блок — типизированная секция контента. Хранится как JSONB в БД (колонка
            <code>contentBlocks</code> / <code>content_blocks</code> у страниц/коллекций),
            редактируется в админке через
            <code>BlockDynamicZone</code>, рендерится на сайте через <code>BlockRenderer</code>.
            Source of truth — файл <code>packages/api/src/shared/blocks/&lt;type&gt;.ts</code>
            с вызовом <code>defineBlock({ type, label, icon, description, category?, fields,
            dataSchema, defaultData })</code>. Декларативный <code>fields: BlockField[]</code> —
            первичен; <code>dataSchema</code> (Zod) и <code>defaultData</code> — производные,
            генератор эмитит их детерминированно.
          </p>
          <p class="callout callout-info">
            <strong>Не правь руками</strong> ни определения блоков, ни admin-редакторы,
            ни реестр <code>blocks/index.ts</code> — это генерируемые артефакты,
            перезаписываются при сохранении схемы. Авторегистрация editor/renderer/preview —
            через <code>import.meta.glob</code>. Полное руководство — <code>docs/blocks.md</code> в репо.
          </p>
        </section>

        <section>
          <h3>1. Dev-билдер <NuxtLink to="/dev/blocks" class="link">/dev/blocks</NuxtLink> (основной путь для людей)</h3>
          <p>
            Раздел «Разработка → Блоки» (только в dev-режиме): создание блока,
            <strong>редактирование схемы полей</strong> существующего и удаление —
            как content-type builder в Strapi. Изменения пишутся прямо в исходники,
            Vite HMR подхватывает без перезапуска.
          </p>
          <p>Что происходит при сохранении схемы:</p>
          <ul>
            <li>определение <code>blocks/&lt;type&gt;.ts</code> перезаписывается целиком канонической эмиссией;</li>
            <li>admin-редактор <code>editors/&lt;Pascal&gt;Block.vue</code> перегенерируется — ручные правки в нём потеряются (восстановление через git);</li>
            <li>web-рендерер <strong>не трогается</strong> — вёрстку под новые поля добавляй руками.</li>
          </ul>
          <p>
            Удаление убирает 4 файла (определение, editor, renderer, превью-PNG) и запись
            из <code>blocks/index.ts</code>. Данные в БД не трогаются — на сайте такие блоки
            рендерятся <code>FallbackBlock</code>.
          </p>
          <p class="callout callout-warn">
            Билдер пишет в рабочую копию git — изменения видны в <code>git diff</code>,
            откат только через git.
          </p>
        </section>

        <section>
          <h3>2. CLI-генератор (альтернатива, для AI)</h3>
          <p>
            Только создание (упадёт, если блок существует). Использует те же эмиттеры,
            что и билдер, — результат байт-в-байт одинаковый. Конфиг кладётся
            в <code>design/blocks/&lt;name&gt;.json</code>:
          </p>
          <pre><code>pnpm generate:block                                       # интерактивный мастер
pnpm generate:block --config design/blocks/feature-grid.json</code></pre>
          <pre><code>{
  "name": "feature-grid",
  "label": "Сетка преимуществ",
  "description": "3–6 карточек с иконкой и текстом",
  "icon": "i-solar-widget-linear",
  "fields": [
    { "name": "title", "type": "string", "label": "Заголовок", "required": true },
    { "name": "showAll", "type": "boolean", "label": "Показывать все", "required": true, "default": true },
    {
      "name": "items", "type": "repeater", "label": "Карточки", "required": true,
      "minItems": 3, "maxItems": 6,
      "subFields": [
        { "name": "title", "type": "string", "label": "Заголовок", "required": true },
        { "name": "image", "type": "image", "label": "Картинка", "required": false }
      ]
    }
  ]
}</code></pre>
          <p>
            <code>default</code> — значение в <code>defaultData</code>, если канонический
            default типа не подходит (например, boolean, включённый по умолчанию).
            В UI билдера не редактируется, но переживает round-trip.
          </p>
        </section>

        <section>
          <h3>3. Типы полей</h3>
          <p>Таблица собирается из реестра <code>BLOCK_FIELD_TYPES</code> — новый тип появится здесь автоматически:</p>
          <table>
            <thead>
              <tr><th>Тип</th><th>Редактор</th><th>Примечания</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in blockFieldTypes" :key="t.value">
                <td>
                  <code>{{ t.value }}</code>
                  <div class="text-(--ui-text-dimmed) text-xs">{{ t.label }}</div>
                </td>
                <td><code>{{ fieldTypeEditors[t.value] }}</code></td>
                <td>{{ fieldTypeNotes[t.value] ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>4. Что генерируется, что руками</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/api/src/shared/blocks/&lt;type&gt;.ts</code> — определение (генерируется, перезаписывается)</li>
            <li><code>apps/admin/.../blocks/editors/&lt;Pascal&gt;Block.vue</code> — редактор (генерируется, перезаписывается)</li>
            <li><code>apps/web/.../blocks/renderers/&lt;Pascal&gt;Block.vue</code> — рендерер (stub при создании, дальше только руками)</li>
            <li><code>apps/admin/.../blocks/previews/&lt;Pascal&gt;BlockPreview.vue</code> — live-превью (только руками, опционально)</li>
            <li><code>apps/admin/public/block-previews/&lt;type&gt;.png</code> — превью в пикере (загружается, коммитится)</li>
          </ul>
          <p>
            Регистрация в <code>blocks/index.ts</code> делается генератором. Editor, renderer
            и preview подхватываются через <code>import.meta.glob</code> по соглашению об именах
            (<code>&lt;PascalCase&gt;Block.vue</code> → тип <code>&lt;kebab-case&gt;</code>).
            Idempotency-тест держит файлы определений байт-в-байт равными канонической
            эмиссии — ручные правки в них уронят <code>pnpm test</code>.
          </p>
        </section>

        <section>
          <h3>5. Кастомизация</h3>
          <p class="callout callout-warn">
            <strong>Editor-SFC руками не дорабатываем</strong> — сохранение схемы из
            билдера перезапишет его целиком. Кастомный код живёт в слоях, которые
            генератор не трогает:
          </p>
          <ul>
            <li><strong>Компоненты типов полей</strong> — <code>ProjectSelector</code>,
              <code>ContactsSelector</code>, <code>TagInput</code> и т.п. Нестандартный инпут =
              новый тип поля: <code>BLOCK_FIELD_TYPES</code> (_core.ts) + entry в
              <code>scripts/generate-block/field-types.ts</code> + label в
              <code>~/utils/block-schema.ts</code> + сам компонент;</li>
            <li><strong>Live-превью</strong> — <code>blocks/previews/&lt;Pascal&gt;BlockPreview.vue</code>:
              авторегистрируется по имени, рендерится под формой редактора, получает
              нормализованные данные через prop <code>data</code>. Для блоков, чей вид
              зависит от внешних данных (project-блоки);</li>
            <li><strong>Web-рендерер</strong> — всегда ручной. Соглашения: обёртка
              <code>&lt;div class="section"&gt;&lt;div class="container-web"&gt;</code>, CSS-токены
              <code>var(--web-*)</code>, иконки <code>lucide:*</code>, richtext через
              <code>v-html</code> + <code>prose-web</code>, ссылки через <code>useActionLink</code>,
              анимации через <code>useMotionPresets()</code>.</li>
          </ul>
        </section>

        <section>
          <h3>6. Превью блока в пикере</h3>
          <p>
            PNG-скриншот по конвенции <code>apps/admin/public/block-previews/&lt;type&gt;.png</code> —
            показывается в пикере «Добавить блок» и в списке <code>/dev/blocks</code>;
            если файла нет — fallback на иконку. Загрузка на странице
            <code>/dev/blocks/&lt;type&gt;</code> (только PNG, до ~3 МБ) или просто положить
            файл руками. <strong>Коммитится в git</strong> — это часть исходников.
          </p>
        </section>

        <section>
          <h3>7. Совместимость контента</h3>
          <p>
            Данные в БД не мигрируются. При загрузке (и в админке, и на сайте) data блока
            мержится с <code>defaultData</code> через <code>normalizeBlockData</code> —
            новые поля получают default. Мерж поверхностный: элементы repeater
            не нормализуются — к новым subFields в старых элементах обращайся опционально.
          </p>
          <ul>
            <li><strong>Переименование поля</strong> = удаление + добавление: данные страниц останутся под старым ключом;</li>
            <li><strong>Смена типа</strong> — данные не конвертируются, рендерер должен быть готов;</li>
            <li><strong>Required-поле</strong> у старого контента получит пустой default — Zod потребует заполнить при следующем сохранении страницы.</li>
          </ul>
        </section>
      </article>

      <article v-if="activeSection === 'collections'" class="space-y-8 prose-docs">
        <section>
          <h2>Коллекции</h2>
          <p>
            Коллекция — отдельная CRUD-сущность с таблицей в БД, oRPC-роутером и
            страницами <code>list</code> / <code>create</code> / <code>[id]</code> в админке.
            Подходит для повторяющегося контента — новости, команда, статьи блога,
            FAQ и т.п. Если контент привязан к странице или другой сущности — это
            не коллекция, а блок или вложенная связь.
          </p>
        </section>

        <section>
          <h3>1. Создать коллекцию</h3>
          <pre><code>pnpm generate:collection</code></pre>
          <p>Мастер спросит:</p>
          <ul>
            <li><strong>Имя</strong> в kebab-case, например <code>team-members</code>;</li>
            <li><strong>Label мн. ч.</strong> на русском, напр. «Сотрудники»;</li>
            <li><strong>Label ед. ч.</strong>, напр. «Сотрудник» — используется в заголовках страниц <code>create</code>/<code>[id]</code>;</li>
            <li><strong>Иконка</strong> в формате <code>i-tabler-*</code> для пункта сайдбара;</li>
            <li><strong>Поля</strong> — циклом (помимо обязательного <code>title</code>).</li>
          </ul>
        </section>

        <section>
          <h3>2. Типы полей</h3>
          <table>
            <thead>
              <tr><th>Тип</th><th>Drizzle</th><th>UI в форме</th></tr>
            </thead>
            <tbody>
              <tr><td><code>string</code></td><td><code>text</code></td><td><code>UInput</code></td></tr>
              <tr><td><code>textarea</code></td><td><code>text</code></td><td><code>UTextarea</code> (4 строки)</td></tr>
              <tr><td><code>number</code></td><td><code>integer</code></td><td><code>UInput type="number"</code></td></tr>
              <tr><td><code>boolean</code></td><td><code>boolean</code> (default false)</td><td><code>USwitch</code></td></tr>
              <tr><td><code>image</code></td><td><code>text</code> (URL)</td><td><code>ImageUpload</code></td></tr>
              <tr><td><code>images</code></td><td><code>jsonb</code> (string[])</td><td><code>GalleryUpload</code></td></tr>
              <tr><td><code>dynamic-blocks</code></td><td><code>jsonb</code> (ContentBlock[])</td><td><code>BlockDynamicZone</code></td></tr>
            </tbody>
          </table>
          <p class="callout callout-info">
            Полный исходник типов и шаблонов — в
            <code>scripts/generate-collection/field-types.ts</code>.
          </p>
        </section>

        <section>
          <h3>3. Что генерируется</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/db/src/schema/&lt;name&gt;.ts</code> — Drizzle-таблица + регистрация в <code>schema/index.ts</code></li>
            <li><code>packages/api/src/routers/&lt;name&gt;.ts</code> — oRPC CRUD: <code>list</code>, <code>getById</code>, <code>create</code>, <code>update</code>, <code>delete</code>; регистрация в <code>routers/index.ts</code></li>
            <li><code>apps/admin/app/pages/&lt;name&gt;/index.vue</code> — список с пагинацией</li>
            <li><code>apps/admin/app/pages/&lt;name&gt;/create.vue</code> — форма создания</li>
            <li><code>apps/admin/app/pages/&lt;name&gt;/[id].vue</code> — форма редактирования</li>
            <li><code>apps/admin/app/composables/useNavigation.ts</code> — пункт сайдбара</li>
          </ul>
        </section>

        <section>
          <h3>4. После генератора</h3>
          <ol>
            <li>Сгенерируй и применить миграцию:
              <pre><code>pnpm --filter @zhk/db db:generate
pnpm --filter @zhk/db db:migrate</code></pre>
            </li>
            <li>Перезапусти dev-сервер (<code>pnpm --filter zhk-admin dev</code>) — Nuxt подхватит новые роуты.</li>
            <li>Открой коллекцию по адресу <code>/&lt;name&gt;</code> в админке.</li>
          </ol>
          <p class="callout callout-warn">
            Если коллекция должна быть доступна публично (на сайте) — добавь
            публичный роутер вручную в <code>packages/api/src/routers/public/</code>.
            Генератор по умолчанию делает только админский CRUD.
          </p>
        </section>

        <section>
          <h3>5. Паттерны страниц</h3>
          <p>
            Страницы коллекций используют те же оптимистичные паттерны, что и
            остальные admin-страницы (vue-query + oRPC):
          </p>
          <ul>
            <li><strong>List</strong> — <code>placeholderData: keepPreviousData</code> убирает мигание при пагинации; <code>@mouseenter</code> на строке делает <code>queryClient.prefetchQuery($orpc.&lt;name&gt;.getById.queryOptions(...))</code> — клик открывает деталь мгновенно;</li>
            <li><strong>Delete</strong> — optimistic: в <code>onMutate</code> снять снапшот через <code>getQueriesData({ queryKey: $orpc.&lt;name&gt;.list.key() })</code>, отфильтровать <code>data</code> и уменьшить <code>total</code>; в <code>onError</code> откатить; в <code>onSettled</code> — <code>invalidateQueries</code>;</li>
            <li><strong>Update</strong> — optimistic: <code>setQueryData($orpc.&lt;name&gt;.getById.queryKey({ input: { id } }), ...)</code>, rollback в <code>onError</code>;</li>
            <li><strong>Тосты</strong> показываем в <code>onSuccess</code>, не в <code>onMutate</code>.</li>
          </ul>
          <p>
            Ключи: <code>.key()</code> — partial match, для <code>invalidateQueries</code> по
            всему роутеру; <code>.queryKey({ input })</code> — full match, для точечного
            <code>setQueryData</code>.
          </p>
        </section>

        <section>
          <h3>6. Коллекция с динамическими блоками</h3>
          <p>
            Если выбрать тип поля <code>dynamic-blocks</code>, страница редактирования
            подключит <code>&lt;BlockDynamicZone&gt;</code> — тот же редактор блоков, что у
            обычных страниц. Удобно для статей и лендингов внутри коллекции.
          </p>
          <p>
            Drizzle-колонка получит тип <code>jsonb</code> с
            <code>$type&lt;ContentBlock[]&gt;()</code>, Zod-схема — <code>contentBlocksSchema</code>.
            Для рендеринга на сайте нужна публичная процедура
            <code>getBySlug</code>/<code>getById</code> и страница в <code>apps/web</code> с
            <code>&lt;BlockRenderer :blocks="..."&gt;</code>.
          </p>
        </section>

        <section>
          <h3>7. Где что лежит</h3>
          <ul class="font-mono text-xs">
            <li><code>scripts/generate-collection.ts</code> — entrypoint мастера</li>
            <li><code>scripts/generate-collection/field-types.ts</code> — типы полей</li>
            <li><code>scripts/generate-collection/templates/</code> — шаблоны schema / router / страниц</li>
            <li><code>scripts/generate-collection/registrations/</code> — авто-вставки в индексы и navigation</li>
          </ul>
        </section>
      </article>

      <article v-if="activeSection === 'modals'" class="space-y-8 prose-docs">
        <section>
          <h2>Модальные окна</h2>
          <p>
            Модалки — контентные сущности: создаются в админке
            (<NuxtLink to="/modals" class="link">/modals</NuxtLink>), вёрстка формы, валидация
            и маски настраиваются без деплоя. На сайте открываются по префиксу
            <code>modal:&lt;slug&gt;</code> в href-ссылках, либо вызовом
            <code>useModalAction().open(slug)</code> из любого компонента.
          </p>
          <p class="callout callout-info">
            <strong>Поток данных.</strong> Админ редактирует запись в таблице
            <code>modals</code> — веб-сайт при открытии подгружает её по slug через
            <code>public.modals.getBySlug</code> и рендерит форму. Отправка попадает в
            <code>public.tickets.create</code> с <code>source=modal:&lt;slug&gt;</code>.
          </p>
        </section>

        <section>
          <h3>1. Создать модалку</h3>
          <ol>
            <li>Открой <NuxtLink to="/modals/create" class="link">/modals/create</NuxtLink>.</li>
            <li>Задай <strong>title</strong> (напр. «Заказать звонок») — slug подставится автоматически.</li>
            <li>Добавь поля формы в секции <em>Поля формы</em>. Доступные типы:
              <ul>
                <li><code>name</code> — однострочный текст;</li>
                <li><code>phone</code> — с настраиваемой маской (по умолчанию <code>+7 (###) ###-##-##</code>);</li>
                <li><code>email</code> — валидация формата;</li>
                <li><code>description</code> — многострочный textarea;</li>
                <li><code>checkbox</code> — согласие, лейбл принимает HTML (включая <code>&lt;a&gt;</code>).</li>
              </ul>
            </li>
            <li>Переключи <strong>статус</strong> в <code>published</code>, сохрани.</li>
          </ol>
          <p class="callout callout-warn">
            Поле «slug» должно быть уникальным в пределах сайта.
            Черновики (<code>draft</code>) на сайт не отдаются — <code>getBySlug</code> вернёт 404.
          </p>
        </section>

        <section>
          <h3>2. Открыть модалку из кнопки</h3>
          <p>В компоненте веб-сайта используй composable <code>useModalAction()</code>:</p>
          <pre><code>&lt;script setup lang="ts"&gt;
const { open } = useModalAction();
&lt;/script&gt;

&lt;template&gt;
  &lt;button type="button" @click="open('zakazat-zvonok')"&gt;
    Заказать звонок
  &lt;/button&gt;
&lt;/template&gt;</code></pre>
          <p>
            Slug должен совпадать с тем, что в админке. Работает и в SSR-, и в CSR-компонентах.
            Глобальный <code>&lt;ModalProvider /&gt;</code> уже смонтирован в
            <code>layouts/default.vue</code> — ничего импортировать не нужно.
          </p>
        </section>

        <section>
          <h3>3. Открыть из ссылки блока</h3>
          <p>
            Любое поле «ссылка» в блоке, в которое контент-менеджер вобьёт
            <code>modal:&lt;slug&gt;</code>, можно прокачать через composable
            <code>useActionLink(href)</code> — он сам определит тег
            (<code>NuxtLink</code> / <code>a</code> / <code>button</code>) и обработчик клика:
          </p>
          <pre><code>&lt;script setup lang="ts"&gt;
const props = defineProps&lt;{ ctaHref: string; ctaLabel: string }&gt;();
const { tag, attrs, onClick } = useActionLink(() =&gt; props.ctaHref);
&lt;/script&gt;

&lt;template&gt;
  &lt;component :is="tag" v-bind="attrs" class="btn" @click="onClick"&gt;
    {{ ctaLabel }}
  &lt;/component&gt;
&lt;/template&gt;</code></pre>
          <ul>
            <li><code>modal:callback</code> → <code>&lt;button&gt;</code>, клик открывает модалку.</li>
            <li><code>https://example.com</code> → <code>&lt;a target="_blank"&gt;</code>.</li>
            <li><code>/projects</code> → <code>&lt;NuxtLink&gt;</code> с SPA-навигацией.</li>
          </ul>
        </section>

        <section>
          <h3>4. Программное управление</h3>
          <p><code>useModalAction()</code> возвращает reactive-стейт:</p>
          <pre><code>const { activeModalSlug, open, close } = useModalAction();

// открыть
open('callback');

// закрыть (например, после redirect-а)
close();

// отреагировать на открытие/закрытие
watch(activeModalSlug, (slug) =&gt; {
  if (slug) console.log('opened', slug);
});</code></pre>
        </section>

        <section>
          <h3>5. Отправка данных</h3>
          <p>
            После клика «Отправить» <code>ModalProvider</code> собирает значения полей и
            вызывает <code>$orpcClient.public.tickets.create</code> с такими полями:
          </p>
          <table>
            <thead>
              <tr><th>Поле тикета</th><th>Источник</th></tr>
            </thead>
            <tbody>
              <tr><td><code>name</code></td><td>значение поля типа <code>name</code></td></tr>
              <tr><td><code>phone</code></td><td>значение <code>phone</code> (обязательное)</td></tr>
              <tr><td><code>email</code></td><td>значение <code>email</code></td></tr>
              <tr><td><code>message</code></td><td>значение <code>description</code> + все кастомные поля</td></tr>
              <tr><td><code>type</code></td><td><code>"callback"</code></td></tr>
              <tr><td><code>source</code></td><td><code>modal:&lt;slug&gt;</code></td></tr>
              <tr><td><code>url</code></td><td><code>window.location.href</code></td></tr>
            </tbody>
          </table>
          <p>Заявки видны в <NuxtLink to="/tickets" class="link">/tickets</NuxtLink>. Если в настройках включён Telegram-бот — уведомление придёт в чат.</p>
        </section>

        <section>
          <h3>6. Fallback поля</h3>
          <p>
            Если у модалки не настроены поля, <code>ModalProvider</code> подставляет дефолтные
            <strong>Имя + Телефон</strong>. Это защита от «забыл настроить» — чтобы убрать,
            отредактируй <code>FALLBACK_FIELDS</code> в
            <code>apps/web/app/components/ModalProvider.vue</code>.
          </p>
        </section>

        <section>
          <h3>7. Где что лежит</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/db/src/schema/modals.ts</code> — таблица + unique (site_id, slug)</li>
            <li><code>packages/api/src/shared/modal-fields.ts</code> — Zod-схема полей</li>
            <li><code>packages/api/src/routers/modals.ts</code> — админ CRUD</li>
            <li><code>packages/api/src/routers/public/modals.ts</code> — <code>getBySlug</code></li>
            <li><code>apps/admin/app/pages/modals/</code> — list / create / [id]</li>
            <li><code>apps/admin/app/components/modals/ModalFieldsEditor.vue</code> — репитер полей</li>
            <li><code>apps/web/app/composables/useModalAction.ts</code> — open/close/activeSlug</li>
            <li><code>apps/web/app/composables/useActionLink.ts</code> — helper для блоков</li>
            <li><code>apps/web/app/components/ModalProvider.vue</code> — рантайм модалки</li>
          </ul>
        </section>
      </article>

      <article v-if="activeSection === 'images'" class="space-y-8 prose-docs">
        <section>
          <h2>Изображения</h2>
          <p>
            Картинки на публичном сайте (<code>apps/web</code>) выводятся
            <strong>только</strong> через компонент <code>&lt;AppImage&gt;</code> (теги)
            или composable <code>useOptimizedImage()</code> (строковые URL).
            Под капотом — <code>@nuxt/image</code> с кастомным провайдером, который
            строит ссылку для self-hosted <strong>imgproxy</strong>: ресайз под нужную
            ширину + WebP/AVIF по заголовку <code>Accept</code>, оригинал тянется из
            S3 по allowlist.
          </p>
          <p class="callout callout-info">
            <strong>Голый <code>&lt;img&gt;</code> в <code>apps/web</code> не используем.</strong>
            В БД и в данных блоков лежит полный S3-URL — там ничего не меняется,
            вся оптимизация на слое рендера. Та же документация в репо —
            <code>docs/images.md</code>.
          </p>
        </section>

        <section>
          <h3>1. Тег картинки — <code>&lt;AppImage&gt;</code></h3>
          <pre><code>&lt;AppImage
  :src="item.image"
  alt="Фасад дома"
  :width="800"
  sizes="sm:100vw lg:33vw"
  loading="lazy"
/&gt;</code></pre>
          <ul>
            <li><code>src</code> — полный S3-URL из данных блока/проекта;</li>
            <li><code>alt</code> — обязателен (для декоративных — <code>alt=""</code>);</li>
            <li><code>width</code> — целевая ширина (драйвит <code>srcset</code>);</li>
            <li>Первый экран (hero, LCP): <code>loading="eager"</code> + <code>:preload="true"</code>;</li>
            <li>Дефолты: <code>fit="cover"</code>, <code>quality=80</code>, <code>loading="lazy"</code>, <code>decoding="async"</code>.</li>
          </ul>
          <p class="callout callout-warn">
            <strong><code>sizes</code> — синтаксис <code>@nuxt/image</code>, не CSS-медиазапрос.</strong>
            Каждый токен с префиксом брейкпоинта: <code>sm:100vw lg:33vw</code>
            (на ширине ≥ <code>sm</code> → 100vw, ≥ <code>lg</code> → 33vw). Брейкпоинты —
            ключи <code>image.screens</code> (<code>xs sm md lg xl xxl</code>).
            ⚠️ Голый токен без префикса (<code>100vw</code>) или CSS-строка
            (<code>(max-width: 768px) 100vw, 33vw</code>) ломают <code>srcset</code> —
            дают мусорные кандидаты <code>1w/2w</code>. Всегда префиксуй брейкпоинтом.
          </p>
        </section>

        <section>
          <h3>2. Строковый URL — <code>useOptimizedImage()</code></h3>
          <p>
            Для случаев, где нужен URL-строка, а не тег: <code>background-image</code>,
            <code>og:image</code>, JSON-LD.
          </p>
          <pre><code>const optimize = useOptimizedImage();
const bg = optimize(block.image, { width: 1600 });
// :style="`background-image: url(${bg})`"</code></pre>
          <p>
            При <code>IMG_PROXY_ENABLED=false</code> возвращает исходный URL без изменений.
          </p>
        </section>

        <section>
          <h3>3. Архитектура</h3>
          <pre><code>данные блока: https://s3.twcstorage.ru/.../foo.jpg
  → &lt;AppImage :src :width 800 sizes=…/&gt;
  → @nuxt/image (provider imgproxy) строит URL
  → {IMG_PROXY_URL}/unsafe/rs:fill:800:0/q:80/{base64url(S3-URL)}
  → imgproxy тянет оригинал из S3 (allowlist) → WebP/AVIF по Accept, кэш
  → браузер грузит оптимизированную картинку (srcset под DPR/ширину)</code></pre>
          <ul class="font-mono text-xs">
            <li><code>apps/web/app/providers/imgproxy-url.ts</code> — чистый билдер URL (юнит-тест)</li>
            <li><code>apps/web/app/providers/imgproxy.ts</code> — провайдер @nuxt/image</li>
            <li><code>apps/web/app/components/AppImage.vue</code> — обёртка + единственная точка тоггла</li>
            <li><code>apps/web/app/composables/useOptimizedImage.ts</code> — строковые URL</li>
            <li><code>apps/web/nuxt.config.ts</code> — <code>image.providers.imgproxy</code> (default) + <code>runtimeConfig.public.imgProxy</code></li>
          </ul>
        </section>

        <section>
          <h3>4. Тоггл и инфраструктура imgproxy</h3>
          <p>
            <strong>Dev:</strong> сервис <code>imgproxy</code> в
            <code>packages/db/docker-compose.yml</code>, поднимается вместе с
            <code>pnpm db:start</code> на <code>http://localhost:8088</code>.
            <strong>Prod:</strong> отдельный сервис imgproxy в Coolify за Traefik на
            поддомене <code>img.&lt;домен&gt;</code> (конфиг — в дашборде, как и для Traefik
            в rate-limiting).
          </p>
          <p>Env imgproxy (одинаков dev/prod):</p>
          <table>
            <thead>
              <tr><th>Переменная</th><th>Значение</th><th>Зачем</th></tr>
            </thead>
            <tbody>
              <tr><td><code>IMGPROXY_ALLOWED_SOURCES</code></td><td><code>https://s3.twcstorage.ru/&lt;bucket&gt;/</code></td><td>только наш бакет — SSRF закрыт</td></tr>
              <tr><td><code>IMGPROXY_AUTO_WEBP</code> / <code>_AVIF</code></td><td><code>true</code></td><td>формат по <code>Accept</code></td></tr>
              <tr><td><code>IMGPROXY_MAX_SRC_RESOLUTION</code></td><td><code>50</code></td><td>защита от бомб-картинок</td></tr>
              <tr><td><code>IMGPROXY_TTL</code></td><td><code>2592000</code></td><td><code>Cache-Control</code> для CDN</td></tr>
              <tr><td><code>IMGPROXY_KEY</code> / <code>_SALT</code></td><td>не задаём</td><td>режим без подписи</td></tr>
            </tbody>
          </table>
          <p>Env приложения (<code>apps/web</code>):</p>
          <table>
            <thead>
              <tr><th>Переменная</th><th>Dev</th><th>Prod</th></tr>
            </thead>
            <tbody>
              <tr><td><code>IMG_PROXY_ENABLED</code></td><td><code>true</code> (<code>false</code> → оригиналы)</td><td><code>true</code></td></tr>
              <tr><td><code>IMG_PROXY_URL</code></td><td><code>http://localhost:8088</code></td><td><code>https://img.&lt;домен&gt;</code></td></tr>
            </tbody>
          </table>
          <p class="callout callout-warn">
            При <code>IMG_PROXY_ENABLED=false</code> <code>&lt;AppImage&gt;</code> рендерит
            нативный <code>&lt;img&gt;</code> с оригиналом из S3 (без ресайза) — локальная
            разработка без поднятого imgproxy и аварийный фолбэк на проде.
            imgproxy ставит <code>Vary: Accept</code> — кэш Traefik/CDN должен это учитывать.
            AVIF заметно нагружает CPU — на проде проверить под нагрузкой, при росте
            латентности отключить <code>IMGPROXY_AUTO_AVIF</code> (оставив WebP).
          </p>
        </section>

        <section>
          <h3>5. Чек-лист для нового блока с картинкой</h3>
          <ol>
            <li>В web-рендерере выводить изображение через <code>&lt;AppImage&gt;</code> (генератор уже эмитит его в stub);</li>
            <li>Задать осмысленные <code>width</code> и <code>sizes</code> (формат брейкпоинтов!) под раскладку блока;</li>
            <li>Первый экран — <code>loading="eager"</code> + <code>:preload="true"</code>; остальное — <code>lazy</code> (дефолт);</li>
            <li>Для <code>background-image</code> / строковых URL — <code>useOptimizedImage()</code>;</li>
            <li>Nullable-источник прикрывай <code>v-if="src"</code> — иначе битый imgproxy-запрос;</li>
            <li>Голый <code>&lt;img&gt;</code> в <code>apps/web</code> — нельзя.</li>
          </ol>
        </section>
      </article>

      <article v-if="activeSection === 'tracking'" class="space-y-8 prose-docs">
        <section>
          <h2>Трекинг событий и аналитика</h2>
          <p>
            Per-site Яндекс.Метрика подключается в админке (<code>/sites/[id]/settings</code> →
            карточка «Яндекс.Метрика»). В коде есть универсальный bus
            <code>useTracking()</code>, через который любой компонент сайта
            стреляет бизнес-событиями. Bus прозрачно рассылает их во все
            включённые провайдеры аналитики.
          </p>
          <p class="callout callout-info">
            <strong>Source of truth — реестр событий</strong>
            <code>packages/api/src/shared/tracking.ts</code>. Одна правка → новое
            событие появляется в TS-типах <code>track()</code>, в админской
            таблице целей (на странице сайта) и в dev-логах. Никаких других
            мест править не нужно.
          </p>
        </section>

        <section>
          <h3>1. Использование в компоненте</h3>
          <pre><code>const { track, trackFormSubmit, trackPhoneClick, trackMessengerClick } = useTracking();

// шорткаты для частых событий
trackFormSubmit("callback");
trackPhoneClick("+7 999 ...");
trackMessengerClick("whatsapp");

// универсальный track — TS подскажет имя из реестра
track("form_submit", { form: "callback" });</code></pre>
          <p>
            В dev все вызовы логируются в консоль:
            <code>[tracking] form_submit — Отправка формы заявки</code>.
          </p>
        </section>

        <section>
          <h3>2. Текущий список событий</h3>
          <p>Собирается из реестра автоматически — это та же таблица, что показывается на странице сайта:</p>
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Категория</th>
                <th>Когда срабатывает</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in TRACKING_EVENT_LIST" :key="ev.name">
                <td><code>{{ ev.name }}</code></td>
                <td>{{ ev.category }}</td>
                <td>
                  <div>{{ ev.title }}</div>
                  <div class="text-(--ui-text-dimmed) text-xs">{{ ev.description }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>3. Добавить новое событие — 1 шаг</h3>
          <p>В <code>packages/api/src/shared/tracking.ts</code> добавить запись:</p>
          <pre><code>export const TRACKING_EVENTS = {
  // ...
  apartment_view: {
    title: "Просмотр квартиры",
    description: "Открытие модалки или страницы квартиры в каталоге",
    category: "engagement",
  },
} as const satisfies Record&lt;string, TrackingEventMeta&gt;;</code></pre>
          <p>Что произойдёт автоматически:</p>
          <ul>
            <li>В <code>track()</code> появится новый ключ с автокомплитом и type-check;</li>
            <li>В админке <code>/sites/[id]/settings</code> в таблице целей появится строка в нужной категории;</li>
            <li>В этой документации — тоже (страница сама собирается из реестра);</li>
            <li>В dev-консоли вызов будет печататься с заголовком из <code>title</code>.</li>
          </ul>
          <p>
            Затем вызывайте в нужном месте: <code>track("apartment_view", { id })</code> и
            сообщите клиенту, что в кабинете Метрики нужно создать цель типа
            <strong>JavaScript-событие</strong> с условием совпадения по имени <code>apartment_view</code>.
          </p>
        </section>

        <section>
          <h3>4. Куда вызывать события</h3>
          <p class="callout callout-warn">
            <strong>Главное правило: ищите централизованную точку.</strong>
          </p>
          <ul>
            <li>
              Все формы заявок проходят через <code>ModalProvider.vue</code> —
              там стоит один <code>trackFormSubmit</code> в успехе сабмита.
              Не разбрасывайте по блокам.
            </li>
            <li>
              <code>tel:</code>-ссылки — в <code>WebHeader</code>,
              <code>WebFooter</code>, <code>ContactsBlock</code>.
            </li>
            <li>
              Иконки соцсетей (мессенджеры) — там же, фильтр по типу
              <code>telegram</code> / <code>whatsapp</code>.
            </li>
            <li>
              Своё действие внутри блока (открытие модалки, скачивание PDF,
              переключение таба) — вызывайте <code>track</code> прямо в
              обработчике в renderer'е блока.
            </li>
          </ul>
        </section>

        <section>
          <h3>5. Добавить нового провайдера аналитики</h3>
          <p>
            Сейчас работает только Яндекс.Метрика. Чтобы подключить ещё один
            сервис (GA4, GTM, Top.Mail.Ru, кастомный пиксель) — bus и блоки
            трогать не нужно:
          </p>
          <ol>
            <li>
              <strong>Расширить схему</strong> <code>SiteSettings.analytics</code> в
              <code>packages/db/src/schema/sites.ts</code>.
            </li>
            <li>
              <strong>Расширить Zod</strong> <code>analyticsSchema</code> в
              <code>packages/api/src/routers/sites.ts</code>.
            </li>
            <li>
              <strong>Реализовать <code>TrackingProvider</code></strong> в
              <code>apps/web/app/utils/tracking-providers.ts</code> и
              добавить в массив <code>TRACKING_PROVIDERS</code>.
            </li>
            <li>
              <strong>Создать Nuxt-плагин</strong> для загрузки SDK
              провайдера в <code>apps/web/app/plugins/&lt;provider&gt;.ts</code>
              по аналогии с <code>yandex-metrika.ts</code>.
            </li>
            <li>
              <strong>Добавить карточку настроек</strong> в
              <code>apps/admin/app/pages/sites/[id]/settings.vue</code> рядом с
              карточкой Метрики.
            </li>
          </ol>
          <p>
            Пример провайдера <code>send</code>:
          </p>
          <pre><code>const googleAnalyticsProvider: TrackingProvider = {
  name: "google-analytics",
  send(gate, event, params) {
    const id = gate?.analytics?.googleAnalytics?.measurementId;
    if (!id) return;
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", event, params ?? {});
  },
};</code></pre>
        </section>

        <section>
          <h3>6. Тестирование в dev</h3>
          <p>
            По умолчанию SDK Метрики в dev <strong>не загружается</strong>
            (чтобы не засорять статистику тестовыми хитами). Но <code>track()</code>
            всегда логирует событие в консоль — срабатывание целей видно
            в DevTools без подключения счётчика.
          </p>
          <p>
            Чтобы включить полноценную загрузку SDK в dev:
          </p>
          <pre><code>NUXT_PUBLIC_METRIKA_DEV=true pnpm dev:web</code></pre>
          <p>
            или в <code>.env</code>:
            <code>NUXT_PUBLIC_METRIKA_DEV=true</code>.
            В кабинете Метрики добавьте <code>localhost</code> как разрешённый
            домен или открывайте страницу с <code>?_ym_debug=1</code>.
          </p>
        </section>

        <section>
          <h3>7. Когда событие НЕ срабатывает</h3>
          <ul>
            <li>Сайт неактивен (<code>gate.status !== 'active'</code>);</li>
            <li>В <code>Site.settings.analytics.yandexMetrika.counterId</code> пусто;</li>
            <li>В dev без <code>NUXT_PUBLIC_METRIKA_DEV=true</code> SDK не грузится (но dev-логи в консоли будут);</li>
            <li>На странице с <code>locked</code>-гейтом (форма ввода пароля).</li>
          </ul>
        </section>

        <section>
          <h3>8. Где что лежит</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/api/src/shared/tracking.ts</code> — реестр событий</li>
            <li><code>packages/api/src/routers/sites.ts</code> — Zod для <code>analytics</code></li>
            <li><code>packages/api/src/routers/public/site.ts</code> — отдаёт <code>analytics</code> на web</li>
            <li><code>packages/db/src/schema/sites.ts</code> — <code>SiteSettings.analytics</code></li>
            <li><code>apps/web/app/composables/useTracking.ts</code> — bus</li>
            <li><code>apps/web/app/utils/tracking-providers.ts</code> — провайдеры</li>
            <li><code>apps/web/app/plugins/yandex-metrika.ts</code> — загрузка SDK + SPA hits</li>
            <li><code>apps/admin/app/pages/sites/[id]/settings.vue</code> — карточка настроек + таблица целей</li>
            <li><code>docs/tracking.md</code> — эта же документация в репо</li>
          </ul>
        </section>
      </article>

      <article v-if="activeSection === 'security'" class="space-y-8 prose-docs">
        <section>
          <h2>Rate limiting</h2>
          <p>
            Публичные формы и критические ручки защищены от спама и брутфорса.
            Три уровня на одном Redis: грубый <strong>per-IP потолок</strong> в Hono,
            лимит <strong>входа</strong> в better-auth и точечный
            <strong>oRPC-middleware</strong> на горячих процедурах. Движок —
            пакет <code>@zhk/ratelimit</code> (rate-limiter-flexible) с
            in-memory подстраховкой при недоступности Redis.
          </p>
          <p class="callout callout-info">
            Подробное руководство для разработчика — <code>docs/rate-limiting.md</code>.
          </p>
        </section>

        <section>
          <h3>Текущие лимиты</h3>
          <table>
            <thead>
              <tr><th>Scope</th><th>Лимит</th><th>При сбое Redis</th><th>Где</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in rateLimitScopes" :key="r.scope">
                <td><code>{{ r.scope }}</code></td>
                <td>{{ r.limit }}</td>
                <td>{{ r.fail === "closed" ? "блокирует (429)" : "пропускает" }}</td>
                <td>{{ r.where }}</td>
              </tr>
            </tbody>
          </table>
          <p>
            Числа — дефолты из <code>packages/ratelimit/src/config.ts</code>,
            переопределяются через env <code>RL_*</code> без правки кода.
            <code>RL_ENABLED=false</code> отключает все лимиты (локальная разработка).
          </p>
        </section>

        <section>
          <h3>Добавить лимит на процедуру</h3>
          <p>Навесь middleware <code>.use(rateLimit(...))</code> до <code>.input</code>:</p>
          <pre><code>import { rateLimit } from "../../middleware/rate-limit";

export const myRouter = {
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", { keyBy: "ip+site" }))
    .input(/* ... */)
    .handler(/* ... */),
};</code></pre>
          <ul>
            <li><code>keyBy</code>: <code>"ip"</code> / <code>"ip+site"</code> / <code>"ip+extra"</code> (с <code>extractExtra</code> — напр. телефон).</li>
            <li><code>failMode</code> НЕ передаётся — берётся из конфига scope.</li>
            <li>Новый scope — одна запись в <code>RATE_LIMIT_DEFAULTS</code> (config.ts).</li>
          </ul>
          <p class="callout callout-warn">
            <strong>fail-open / fail-closed.</strong> Чтение и формы при недоступности
            Redis <em>пропускаются</em> (сайт работает). Вход, разблокировка сайта и
            создание заявок <em>блокируются</em> (брутфорс важнее доступности).
          </p>
        </section>

        <section>
          <h3>За прокси (Traefik)</h3>
          <p class="callout callout-warn">
            IP клиента берётся из <code>x-forwarded-for</code>. Это безопасно
            <strong>только</strong> если reverse-proxy (Traefik) перезаписывает
            заголовок реальным IP. Если прокси доверяет входящему значению —
            клиент подделает IP и обойдёт лимит. Перед прод-деплоем проверить
            конфиг Traefik (<code>forwardedHeaders.trustedIPs</code>).
          </p>
        </section>

        <section>
          <h3>Где что лежит</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/ratelimit/</code> — движок (getClientIp, createLimiter, consume, config)</li>
            <li><code>packages/api/src/middleware/rate-limit.ts</code> — oRPC middleware</li>
            <li><code>apps/server/src/middleware/rate-limit.ts</code> — Hono потолок</li>
            <li><code>packages/auth/src/index.ts</code> — better-auth sign-in лимит</li>
            <li><code>packages/env/src/server.ts</code> — REDIS_URL, RL_*</li>
          </ul>
        </section>
      </article>

      <article v-if="activeSection === 'observability'" class="space-y-8 prose-docs">
        <section>
          <h2>Ошибки → GlitchTip Issues</h2>
          <p>
            Трекинг ошибок на <code>@sentry/node</code> → self-hosted
            <strong>GlitchTip</strong> (Sentry-совместимый дашборд Issues: группировка,
            алёрты, resolve/ignore). В Issues уходят <strong>только неожиданные</strong>
            ошибки (5xx / необработанные), с тегами <code>operation</code>/<code>siteId</code>/<code>userId</code>
            и <code>why</code>/<code>fix</code>/<code>code</code> в extra. Ожидаемые доменные
            4xx (404/401/403/429) в дашборд не шлются — чисто, без спама.
          </p>
          <p class="callout callout-info">
            Полное руководство и runbook локального GlitchTip — <code>docs/observability.md</code>.
            Выключатель — env <code>GLITCHTIP_DSN</code> (пусто → отправка выключена, no-op).
          </p>
        </section>

        <section>
          <h3>Архитектура</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/observability</code> — обвязка: <code>initSentry</code>, <code>captureUnexpected</code>, каталог <code>appErrors</code></li>
            <li><code>apps/server</code> — oRPC-middleware <code>sentryCapture</code> (ловит ошибки процедур) + <code>app.onError</code></li>
            <li><code>apps/admin</code> — модуль <code>@sentry/nuxt</code> (client + server)</li>
            <li><code>apps/web</code> — <code>@sentry/node</code> в Nitro (хук <code>error</code>): <strong>только серверные/SSR</strong>, без браузерного SDK</li>
          </ul>
          <p class="callout callout-info">
            DSN остаётся <strong>server-side</strong>: у публичного <code>web</code> браузерного
            SDK нет (сайт лёгкий, DSN не утекает). У <code>admin</code> DSN попадает в браузер
            через public runtimeConfig — это допустимо (Sentry DSN — публичный ingest-ключ, админка внутренняя).
          </p>
        </section>

        <section>
          <h3>Что считается «неожиданным»</h3>
          <p>
            Чистая функция <code>isUnexpectedError(status)</code> в
            <code>packages/observability/src/sentry.ts</code>. В Issues шлём ТОЛЬКО:
          </p>
          <ul>
            <li><code>ORPCError</code> со статусом <strong>≥ 500</strong>, ИЛИ</li>
            <li>любой не-<code>ORPCError</code> throw (обычный <code>Error</code> — статус неизвестен → считаем неожиданным).</li>
          </ul>
          <p>
            Ожидаемые 4xx — нормальный control-flow, не баг. oRPC-ошибки ловит middleware
            <code>sentryCapture</code> на <code>publicProcedure</code>; Hono-level/необработанные — <code>app.onError</code>.
          </p>
        </section>

        <section>
          <h3>Каталог доменных ошибок (why/fix)</h3>
          <p>
            <code>packages/observability/src/errors.ts</code> — простые фабрики, возвращающие
            <code>ORPCError</code>. <code>code</code>/<code>why</code>/<code>fix</code> лежат в
            <code>ORPCError.data</code> (их читают <code>captureUnexpected</code> для тегов и клиент):
          </p>
          <pre><code>import { appErrors } from "@zhk/observability/errors";

// в oRPC-процедуре — обычная 4xx, клиенту вернётся 404, в Issues НЕ попадёт:
throw appErrors.NOT_FOUND({ entity: "Страница" });</code></pre>
          <p>
            Конвенция: для повторяющихся доменных случаев предпочитать каталог вместо
            «голого» <code>new ORPCError(...)</code> — чтобы <code>why</code>/<code>fix</code> были при ошибке.
          </p>
        </section>

        <section>
          <h3>Локальный GlitchTip (проверка)</h3>
          <p>Standalone, отдельно от проекта:</p>
          <pre><code>docker compose -f docs/observability/glitchtip.compose.yml up -d
# http://localhost:8000 → регистрация → проект → DSN → в apps/server/.env как GLITCHTIP_DSN
docker compose -f docs/observability/glitchtip.compose.yml down   # остановить</code></pre>
          <p class="callout callout-warn">
            <strong>Грабли.</strong> При <code>Sentry.init</code> <em>не</em> ставить
            <code>defaultIntegrations: false</code> — с ним <code>@sentry/node</code> перестаёт
            <em>доставлять</em> события (создаётся, но не уходит). И не возвращать
            <code>evlog</code>: в pnpm-монорепо он ставится несколькими физическими копиями
            (peer-варианты) → его global-конфиг не применяется к событиям из другой копии,
            до бэкенда не доходит ничего.
          </p>
        </section>

        <section>
          <h3>Где что лежит</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/observability/src/sentry.ts</code> — initSentry, captureUnexpected, isUnexpectedError</li>
            <li><code>packages/observability/src/errors.ts</code> — каталог appErrors</li>
            <li><code>packages/api/src/orpc-base.ts</code> — middleware sentryCapture (тег siteId)</li>
            <li><code>apps/web/server/plugins/sentry.ts</code> — Nitro error-hook (web)</li>
            <li><code>apps/admin/sentry.{client,server}.config.ts</code> — @sentry/nuxt</li>
            <li><code>packages/env/src/server.ts</code> — GLITCHTIP_DSN</li>
            <li><code>docs/observability.md</code> + <code>docs/observability/glitchtip.compose.yml</code></li>
          </ul>
        </section>
      </article>
    </div>
  </PageContainer>
</template>

<style scoped>
.prose-docs :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.prose-docs :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 0;
}
.prose-docs :deep(p),
.prose-docs :deep(li) {
  color: var(--ui-text-muted);
  line-height: 1.6;
  font-size: 0.875rem;
}
.prose-docs :deep(ul),
.prose-docs :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.5rem 0;
  list-style: disc;
}
.prose-docs :deep(ol) {
  list-style: decimal;
}
.prose-docs :deep(code) {
  background: var(--ui-bg-elevated);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.8em;
  color: var(--ui-text-highlighted);
}
.prose-docs :deep(pre) {
  background: var(--ui-bg-elevated);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
}
.prose-docs :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--ui-text-highlighted);
}
.prose-docs :deep(.link) {
  color: var(--ui-primary);
  text-decoration: underline;
}
.prose-docs :deep(.callout) {
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
  font-size: 0.85rem;
  margin: 0.75rem 0;
}
.prose-docs :deep(.callout-warn) {
  border-color: rgb(245 158 11 / 0.4);
  background: rgb(245 158 11 / 0.08);
}
.prose-docs :deep(.callout-info) {
  border-color: rgb(59 130 246 / 0.4);
  background: rgb(59 130 246 / 0.08);
}
.prose-docs :deep(table) {
  width: 100%;
  font-size: 0.85rem;
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.prose-docs :deep(th),
.prose-docs :deep(td) {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}
.prose-docs :deep(th) {
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.prose-docs :deep(section) {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  border-radius: 0.5rem;
  padding: 1.5rem;
}
</style>
