<script setup lang="ts">
type Tone = "success" | "warning" | "error" | "info" | "muted" | "neutral";

withDefaults(
  defineProps<{
    tone?: Tone;
    label?: string;
    dot?: boolean;
    pulse?: boolean;
  }>(),
  { tone: "neutral", dot: false, pulse: false },
);

const toneClass: Record<Tone, string> = {
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  info: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  muted:
    "bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)",
  neutral:
    "bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)",
};

const dotClass: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-indigo-500",
  muted: "bg-zinc-400",
  neutral: "bg-zinc-400",
};
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap"
    :class="toneClass[tone]"
  >
    <span
      v-if="dot"
      class="size-1.5 rounded-full shrink-0"
      :class="[dotClass[tone], pulse && 'animate-pulse']"
    />
    <slot>{{ label }}</slot>
  </span>
</template>
