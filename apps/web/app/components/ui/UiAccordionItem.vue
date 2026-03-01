<script setup lang="ts">
defineProps<{
  value: string;
  title: string;
  disabled?: boolean;
}>();
</script>

<template>
  <AccordionItem :value="value" :disabled="disabled" class="py-4" v-bind="$attrs">
    <AccordionHeader>
      <AccordionTrigger
        class="group flex w-full items-center justify-between text-left text-sm font-medium text-[var(--web-text-primary)] hover:text-[var(--web-accent)] transition-colors"
      >
        {{ title }}
        <Icon
          name="lucide:chevron-down"
          class="size-4 shrink-0 text-[var(--web-text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </AccordionTrigger>
    </AccordionHeader>
    <AccordionContent class="overflow-hidden data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out]">
      <div class="pt-3 text-sm text-[var(--web-text-secondary)]">
        <slot />
      </div>
    </AccordionContent>
  </AccordionItem>
</template>
