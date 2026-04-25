<script setup lang="ts">
const sections = [
  { id: "blocks", label: "Блоки", icon: "i-tabler-stack-2" },
  { id: "collections", label: "Коллекции", icon: "i-tabler-database" },
  { id: "modals", label: "Модальные окна", icon: "i-tabler-app-window" },
];

const activeSection = ref("blocks");
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center gap-3">
      <UIcon name="i-tabler-book" class="size-6 text-(--ui-text-muted)" />
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
            Блок — типизированная секция контента. Хранится как JSONB в БД (поле
            <code>blocks</code> у страниц/коллекций), редактируется в админке через
            <code>BlockDynamicZone</code>, рендерится на сайте одноимённым компонентом.
            Source of truth — файл <code>packages/api/src/shared/blocks/&lt;type&gt;.ts</code>
            с вызовом <code>defineBlock({ type, label, icon, description, dataSchema, defaultData })</code>:
            оттуда тянутся Zod-схема, метаданные для picker и default-значения.
          </p>
          <p class="callout callout-info">
            <strong>Не правь руками</strong> ни реестр <code>blocks/index.ts</code>, ни default data,
            ни авто-регистрацию в admin/web. Всё собирается генератором и
            <code>import.meta.glob</code>.
          </p>
        </section>

        <section>
          <h3>1. Создать блок (интерактивно)</h3>
          <p>
            Запусти мастер из корня монорепо:
          </p>
          <pre><code>pnpm generate:block</code></pre>
          <p>Мастер последовательно спросит:</p>
          <ul>
            <li><strong>Имя</strong> в kebab-case, например <code>hero-banner</code>;</li>
            <li><strong>Label</strong> (видно в picker блоков), напр. «Hero-баннер»;</li>
            <li><strong>Описание</strong> — короткая подсказка для контент-менеджера;</li>
            <li><strong>Иконка</strong> в формате <code>i-tabler-*</code>;</li>
            <li><strong>Поля</strong> — циклом, по каждому: имя, тип, label, обязательность.</li>
          </ul>
        </section>

        <section>
          <h3>2. Создать блок через JSON-конфиг</h3>
          <p>
            Удобно, когда поля известны заранее (например, после анализа PNG-прототипа).
            Конфиг кладётся в <code>design/blocks/&lt;name&gt;.json</code>:
          </p>
          <pre><code>{
  "name": "feature-grid",
  "label": "Сетка преимуществ",
  "description": "3–6 карточек с иконкой и текстом",
  "icon": "i-tabler-layout-grid",
  "fields": [
    { "name": "title", "type": "string", "label": "Заголовок", "required": true },
    { "name": "subtitle", "type": "text", "label": "Подзаголовок", "required": false },
    {
      "name": "items", "type": "repeater", "label": "Карточки", "required": true,
      "minItems": 3, "maxItems": 6,
      "subFields": [
        { "name": "icon", "type": "string", "label": "Иконка lucide", "required": true },
        { "name": "title", "type": "string", "label": "Заголовок", "required": true },
        { "name": "text", "type": "text", "label": "Описание", "required": true }
      ]
    }
  ]
}</code></pre>
          <p>Запуск:</p>
          <pre><code>pnpm generate:block --config design/blocks/feature-grid.json</code></pre>
        </section>

        <section>
          <h3>3. Типы полей</h3>
          <table>
            <thead>
              <tr><th>Тип</th><th>Описание</th><th>Доп. параметры</th></tr>
            </thead>
            <tbody>
              <tr><td><code>string</code></td><td>Однострочный текст (UInput)</td><td>—</td></tr>
              <tr><td><code>text</code></td><td>Многострочный (UTextarea)</td><td>—</td></tr>
              <tr><td><code>richtext</code></td><td>Форматированный (UEditor)</td><td>—</td></tr>
              <tr><td><code>number</code></td><td>Число</td><td>—</td></tr>
              <tr><td><code>boolean</code></td><td>Переключатель (USwitch)</td><td>—</td></tr>
              <tr><td><code>url</code></td><td>Ссылка</td><td>—</td></tr>
              <tr><td><code>image</code></td><td>Один файл (ImageUpload)</td><td>—</td></tr>
              <tr><td><code>images</code></td><td>Галерея (GalleryUpload)</td><td>—</td></tr>
              <tr><td><code>select</code></td><td>Выбор из списка</td><td><code>options: string[]</code></td></tr>
              <tr><td><code>repeater</code></td><td>Массив повторяющихся групп</td><td><code>subFields[]</code>, <code>minItems</code>, <code>maxItems</code></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>4. Что генерируется</h3>
          <ul class="font-mono text-xs">
            <li><code>packages/api/src/shared/blocks/&lt;type&gt;.ts</code> — <code>defineBlock(...)</code> с Zod-схемой и default data</li>
            <li><code>apps/admin/app/components/blocks/editors/&lt;Pascal&gt;Block.vue</code> — редактор</li>
            <li><code>apps/web/app/components/blocks/renderers/&lt;Pascal&gt;Block.vue</code> — рендерер (stub)</li>
          </ul>
          <p>
            Регистрация в <code>packages/api/src/shared/blocks/index.ts</code> делается генератором.
            Editor и renderer подхватываются автоматически через <code>import.meta.glob</code>
            по соглашению об именах (<code>&lt;PascalCase&gt;Block.vue</code> → тип <code>&lt;kebab-case&gt;</code>).
          </p>
        </section>

        <section>
          <h3>5. Доработать web-рендерер</h3>
          <p>
            Генератор оставляет stub <code v-pre>&lt;pre&gt;{{ $props }}&lt;/pre&gt;</code>.
            Замени на вёрстку по прототипу. Памятка по соглашениям apps/web:
          </p>
          <ul>
            <li>обёртка: <code>&lt;div class="section"&gt;&lt;div class="container-web"&gt;…&lt;/div&gt;&lt;/div&gt;</code>;</li>
            <li>цвета и фоны через CSS-токены: <code>var(--web-text-primary)</code>, <code>var(--web-accent)</code>, <code>var(--web-bg-muted)</code>, <code>var(--web-border)</code>;</li>
            <li>иконки — <code>&lt;Icon name="lucide:..."/&gt;</code>;</li>
            <li>richtext — <code>v-html</code> + <code>class="prose-web"</code>;</li>
            <li>ссылки из полей блока пропускай через <code>useActionLink(href)</code>, чтобы поддержать <code>modal:&lt;slug&gt;</code>;</li>
            <li>анимации — <code>useMotionPresets()</code> (<code>fadeUp</code>, <code>staggerContainer</code> и т.д.) + <code>&lt;Motion as="div" :while-in-view="…" :in-view-options="{ once: true }"&gt;</code>.</li>
          </ul>
        </section>

        <section>
          <h3>6. Workflow PNG → блок</h3>
          <ol>
            <li>Положи PNG-прототип в <code>design/blocks/&lt;name&gt;.png</code>;</li>
            <li>AI читает картинку и предлагает структуру полей (тип, label, repeater);</li>
            <li>после подтверждения сохраняется <code>design/blocks/&lt;name&gt;.json</code>;</li>
            <li>AI запускает <code>pnpm generate:block --config design/blocks/&lt;name&gt;.json</code>;</li>
            <li>AI заменяет stub renderer вёрсткой по прототипу.</li>
          </ol>
        </section>

        <section>
          <h3>7. Удалить блок</h3>
          <p>
            Удали три файла блока (<code>shared/blocks/&lt;type&gt;.ts</code>, admin editor, web renderer)
            и убери импорт+entry из массива <code>allBlocks</code> в
            <code>packages/api/src/shared/blocks/index.ts</code>. Больше ничего трогать не нужно —
            existing записи в БД с этим <code>type</code> просто перестанут рендериться (можно
            предусмотреть миграцию, если они есть в проде).
          </p>
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
