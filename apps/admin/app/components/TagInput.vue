<script setup lang="ts">
const model = defineModel<string[]>({ default: () => [] });

const inputValue = ref("");

function addTag() {
  const tag = inputValue.value.trim();
  if (tag && !model.value.includes(tag)) {
    model.value = [...model.value, tag];
  }
  inputValue.value = "";
}

function removeTag(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag();
  }
  if (e.key === "Backspace" && inputValue.value === "" && model.value.length > 0) {
    removeTag(model.value.length - 1);
  }
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg) px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-(--ui-primary)"
  >
    <UBadge v-for="(tag, i) in model" :key="tag" variant="subtle" color="neutral" class="gap-1">
      {{ tag }}
      <button class="ml-0.5 hover:text-(--ui-text)" @click="removeTag(i)">
        <UIcon name="i-solar-close-circle-linear" class="size-3" />
      </button>
    </UBadge>
    <input
      v-model="inputValue"
      placeholder="Введите тег и нажмите Enter"
      class="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-(--ui-text-dimmed)"
      @keydown="onKeydown"
      @blur="addTag"
    />
  </div>
</template>
