<script setup lang="ts">
const items = useBreadcrumbsState();
const url = useRequestURL();
const route = useRoute();

/** JSON-LD: каждому звену нужен url; у звеньев без href берём текущий путь. */
useJsonLd(() => {
  if (!items.value || items.value.length === 0) return null;
  return buildBreadcrumbJsonLd(
    items.value.map((it) => ({
      name: it.label,
      url: `${url.origin}${it.href ?? route.path}`,
    })),
  );
});
</script>

<template>
  <nav
    v-if="items && items.length"
    aria-label="Хлебные крошки"
    class="breadcrumbs section container-web"
  >
    <ol class="flex flex-wrap items-center gap-2 text-sm text-[var(--web-text-secondary)]">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="flex items-center gap-2"
      >
        <NuxtLink
          v-if="item.href && i < items.length - 1"
          :to="item.href"
          class="hover:text-[var(--web-text-primary)]"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else :aria-current="i === items.length - 1 ? 'page' : undefined">
          {{ item.label }}
        </span>
        <span v-if="i < items.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
