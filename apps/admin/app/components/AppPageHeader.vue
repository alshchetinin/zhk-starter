<script setup lang="ts">
type Crumb = { label: string; to?: string };

defineProps<{
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  back?: string;
}>();
</script>

<template>
  <header class="flex items-end justify-between gap-4 mb-6 flex-wrap">
    <div class="min-w-0 flex-1">
      <div
        v-if="crumbs?.length || back"
        class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed) mb-1.5"
      >
        <NuxtLink
          v-if="back"
          :to="back"
          class="hover:text-(--ui-text) transition flex items-center"
        >
          <UIcon name="i-solar-arrow-left-linear" class="size-3.5" />
        </NuxtLink>
        <template v-for="(c, i) in crumbs" :key="i">
          <UIcon
            v-if="i > 0 || back"
            name="i-solar-alt-arrow-right-linear"
            class="size-3 shrink-0"
          />
          <NuxtLink
            v-if="c.to"
            :to="c.to"
            class="hover:text-(--ui-text) transition truncate"
          >
            {{ c.label }}
          </NuxtLink>
          <span v-else class="text-(--ui-text) font-medium truncate">
            {{ c.label }}
          </span>
        </template>
      </div>
      <h1 class="text-xl font-semibold tracking-tight truncate">{{ title }}</h1>
      <p v-if="subtitle" class="text-xs text-(--ui-text-dimmed) mt-0.5">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-1.5 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
