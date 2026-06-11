<script setup lang="ts">
import type { BlockField, BlockFieldType } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { blockFieldTypes, blockSubFieldTypes } from "~/utils/block-schema";

const props = defineProps<{
  mode: "create" | "edit";
}>();

const meta = defineModel<BlockMetaForm>("meta", { required: true });
// ВАЖНО: caller обязан передавать клон (structuredClone) — форма мутирует
// вложенные объекты напрямую, передача allBlocks[].fields без клона испортит
// реестр до перезагрузки.
const fields = defineModel<BlockField[]>("fields", { required: true });

// Стабильные ключи v-for: фокус не прыгает при reorder/удалении
const keys = new WeakMap<object, number>();
let nextKey = 1;
function keyOf(o: object) {
  if (!keys.has(o)) keys.set(o, nextKey++);
  return keys.get(o)!;
}

// Смена типа сбрасывает default — старый default может противоречить новой схеме
function setFieldType(f: BlockField, type: BlockFieldType) {
  f.type = type;
  delete f.default;
}

function addField() {
  fields.value = [
    ...fields.value,
    { name: "", type: "string", label: "", required: true },
  ];
}
function removeField(i: number) {
  fields.value = fields.value.filter((_, idx) => idx !== i);
}
function moveField(i: number, dir: -1 | 1) {
  const to = i + dir;
  if (to < 0 || to >= fields.value.length) return;
  const arr = [...fields.value];
  [arr[i]!, arr[to]!] = [arr[to]!, arr[i]!];
  fields.value = arr;
}
function addSubField(parent: BlockField) {
  if (!parent.subFields) parent.subFields = [];
  parent.subFields.push({ name: "", type: "string", label: "", required: true });
}
function removeSubField(parent: BlockField, i: number) {
  parent.subFields!.splice(i, 1);
}
</script>

<template>
  <div class="space-y-4">
    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Имя (kebab-case)" required hint="Например: hero-fullscreen">
          <UInput v-model="meta.name" placeholder="block-name" :disabled="props.mode === 'edit'" />
        </UFormField>
        <UFormField label="Label (RU)" required>
          <UInput v-model="meta.label" placeholder="Название блока" />
        </UFormField>
      </div>
      <UFormField label="Описание" required>
        <UInput v-model="meta.description" />
      </UFormField>
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Иконка (i-solar-*-linear)" required>
          <UInput v-model="meta.icon">
            <template #trailing>
              <UIcon :name="meta.icon" class="size-4" />
            </template>
          </UInput>
        </UFormField>
        <UFormField label="Категория">
          <USelect
            v-model="meta.category"
            :items="[
              { label: '— без категории —', value: 'none' },
              { label: 'Контент', value: 'content' },
              { label: 'Проектный', value: 'project' },
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg)">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-medium">Поля</h2>
        <UButton icon="i-solar-add-square-linear" size="sm" variant="soft" @click="addField">
          Добавить поле
        </UButton>
      </div>

      <p v-if="!fields.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
        У блока должно быть хотя бы одно поле
      </p>

      <div v-else class="space-y-3">
        <div
          v-for="(field, i) in fields"
          :key="keyOf(field)"
          class="p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/30"
        >
          <div class="flex items-start gap-2">
            <div class="flex flex-col gap-0.5">
              <UButton
                icon="i-solar-alt-arrow-up-linear"
                size="xs"
                variant="ghost"
                :disabled="i === 0"
                @click="moveField(i, -1)"
              />
              <UButton
                icon="i-solar-alt-arrow-down-linear"
                size="xs"
                variant="ghost"
                :disabled="i === fields.length - 1"
                @click="moveField(i, 1)"
              />
            </div>
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UInput v-model="field.name" placeholder="name (camelCase)" size="sm" />
              <UInput v-model="field.label" placeholder="Label" size="sm" />
              <USelect
                :model-value="field.type"
                :items="blockFieldTypes"
                size="sm"
                class="w-full"
                @update:model-value="setFieldType(field, $event)"
              />
              <div class="flex items-center gap-2">
                <USwitch v-model="field.required" />
                <span class="text-xs">обязательное</span>
              </div>

              <UInput
                v-if="field.type === 'select'"
                :model-value="(field.options ?? []).join(', ')"
                placeholder="опция1, опция2, опция3"
                size="sm"
                class="col-span-2"
                @update:model-value="field.options = String($event).split(',').map(s => s.trim()).filter(Boolean)"
              />

              <div v-if="field.type === 'repeater'" class="col-span-2 grid grid-cols-2 gap-2">
                <UInput v-model.number="field.minItems" type="number" placeholder="min items" size="sm" />
                <UInput v-model.number="field.maxItems" type="number" placeholder="max items" size="sm" />
              </div>
            </div>
            <UButton
              icon="i-solar-trash-bin-trash-linear"
              size="xs"
              color="error"
              variant="ghost"
              @click="removeField(i)"
            />
          </div>

          <div v-if="field.type === 'repeater'" class="mt-3 pl-3 border-l-2 border-(--ui-border)">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-(--ui-text-muted)">Под-поля repeater'а</span>
              <UButton icon="i-solar-add-square-linear" size="xs" variant="ghost" @click="addSubField(field)">
                Под-поле
              </UButton>
            </div>
            <div v-if="field.subFields?.length" class="space-y-2">
              <div
                v-for="(sf, si) in field.subFields"
                :key="keyOf(sf)"
                class="flex items-start gap-2"
              >
                <div class="flex-1 grid grid-cols-2 gap-2">
                  <UInput v-model="sf.name" placeholder="name" size="xs" />
                  <UInput v-model="sf.label" placeholder="Label" size="xs" />
                  <USelect
                    :model-value="sf.type"
                    :items="blockSubFieldTypes"
                    size="xs"
                    class="w-full"
                    @update:model-value="setFieldType(sf, $event)"
                  />
                  <div class="flex items-center gap-2">
                    <USwitch v-model="sf.required" />
                    <span class="text-xs">обязательное</span>
                  </div>
                </div>
                <UButton
                  icon="i-solar-close-circle-linear"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="removeSubField(field, si)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
