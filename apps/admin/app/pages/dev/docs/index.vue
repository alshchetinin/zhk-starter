<script setup lang="ts">
const sections = [
  { id: "modals", label: "Модальные окна", icon: "i-tabler-app-window" },
];

const activeSection = ref("modals");
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
