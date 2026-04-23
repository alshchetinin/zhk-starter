<script setup lang="ts">
const props = defineProps<{
  kind: PurchaseMethodKind;
}>();

const data = defineModel<Record<string, unknown>>({ required: true });

const fields = computed(() => purchaseMethodKindFields[props.kind] ?? []);

function setField(name: string, value: unknown) {
  data.value = { ...data.value, [name]: value };
}

function getField(name: string) {
  return data.value?.[name];
}
</script>

<template>
  <div v-if="fields.length" class="space-y-4">
    <template v-for="f in fields" :key="f.name">
      <UFormField :label="f.label" :hint="f.hint">
        <UTextarea
          v-if="f.type === 'textarea'"
          :model-value="(getField(f.name) as string) ?? ''"
          :rows="3"
          :placeholder="f.placeholder"
          @update:model-value="(v) => setField(f.name, v || undefined)"
        />
        <UInput
          v-else-if="f.type === 'number'"
          type="number"
          :model-value="(getField(f.name) as number) ?? undefined"
          :placeholder="f.placeholder"
          @update:model-value="(v) => setField(f.name, v === '' ? undefined : Number(v))"
        />
        <USwitch
          v-else-if="f.type === 'boolean'"
          :model-value="Boolean(getField(f.name))"
          @update:model-value="(v) => setField(f.name, v)"
        />
        <UInput
          v-else
          :model-value="(getField(f.name) as string) ?? ''"
          :placeholder="f.placeholder"
          :type="f.type === 'url' ? 'url' : 'text'"
          @update:model-value="(v) => setField(f.name, v || undefined)"
        />
      </UFormField>
    </template>
  </div>
  <p v-else class="text-sm text-(--ui-text-muted)">
    Для этого типа способа покупки нет дополнительных полей.
  </p>
</template>
