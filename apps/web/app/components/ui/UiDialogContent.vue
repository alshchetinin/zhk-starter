<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    showClose?: boolean;
  }>(),
  { showClose: true },
);
</script>

<template>
  <DialogPortal>
    <DialogOverlay as-child>
      <Motion
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.15 }"
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      />
    </DialogOverlay>

    <DialogContent as-child>
      <Motion
        :initial="{ opacity: 0, scale: 0.95, y: 8 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :exit="{ opacity: 0, scale: 0.95, y: 8 }"
        :transition="{ type: 'spring', stiffness: 400, damping: 30 }"
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--web-bg)] p-6 shadow-xl focus:outline-none"
      >
        <DialogTitle v-if="title" class="text-lg font-semibold text-[var(--web-text-primary)]">
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description" class="mt-1.5 text-sm text-[var(--web-text-secondary)]">
          {{ description }}
        </DialogDescription>

        <div :class="title || description ? 'mt-4' : ''">
          <slot />
        </div>

        <DialogClose
          v-if="showClose"
          class="absolute right-4 top-4 rounded-md p-1 text-[var(--web-text-muted)] hover:text-[var(--web-text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--web-accent)]"
        >
          <Icon name="lucide:x" class="size-4" />
        </DialogClose>
      </Motion>
    </DialogContent>
  </DialogPortal>
</template>
