<script setup lang="ts">
type Accent = "emerald" | "indigo" | "violet" | "amber" | "red" | "zinc" | "sky";

withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    sub?: string;
    accent?: Accent;
    to?: string;
    icon?: string;
  }>(),
  { accent: "zinc" },
);

const gradientClass: Record<Accent, string> = {
  emerald: "from-emerald-500/[0.05]",
  indigo: "from-indigo-500/[0.05]",
  violet: "from-violet-500/[0.05]",
  amber: "from-amber-500/[0.06]",
  red: "from-red-500/[0.07]",
  zinc: "from-zinc-500/[0.04]",
  sky: "from-sky-500/[0.05]",
};

const baseClass =
  "group relative block overflow-hidden rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4 transition-all";
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :class="[baseClass, 'hover:border-(--ui-text-dimmed)']"
  >
    <div
      class="absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none"
      :class="gradientClass[accent]"
    />
    <div class="relative">
      <div class="flex items-center justify-between mb-2">
        <span
          class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-(--ui-text-dimmed) font-medium"
        >
          <UIcon v-if="icon" :name="icon" class="size-3.5" />
          {{ label }}
        </span>
        <UIcon
          name="i-tabler-arrow-up-right"
          class="size-3.5 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition"
        />
        <slot name="badge" />
      </div>
      <div v-if="value != null || $slots.value" class="flex items-baseline gap-2 mb-3">
        <span class="text-3xl font-semibold tabular-nums tracking-tight">
          <slot name="value">{{ value }}</slot>
        </span>
        <span v-if="sub" class="text-xs text-(--ui-text-dimmed)">{{ sub }}</span>
        <slot name="sub" />
      </div>
      <slot />
    </div>
  </NuxtLink>
  <div v-else :class="baseClass">
    <div
      class="absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none"
      :class="gradientClass[accent]"
    />
    <div class="relative">
      <div class="flex items-center justify-between mb-2">
        <span
          class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-(--ui-text-dimmed) font-medium"
        >
          <UIcon v-if="icon" :name="icon" class="size-3.5" />
          {{ label }}
        </span>
        <slot name="badge" />
      </div>
      <div v-if="value != null || $slots.value" class="flex items-baseline gap-2 mb-3">
        <span class="text-3xl font-semibold tabular-nums tracking-tight">
          <slot name="value">{{ value }}</slot>
        </span>
        <span v-if="sub" class="text-xs text-(--ui-text-dimmed)">{{ sub }}</span>
        <slot name="sub" />
      </div>
      <slot />
    </div>
  </div>
</template>
