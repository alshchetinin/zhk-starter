<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

interface FieldInput {
  name: string;
  type: string;
  label: string;
  required: boolean;
  description?: string;
  options?: string[];
  minItems?: number;
  maxItems?: number;
  subFields?: FieldInput[];
}

const fieldTypes = [
  { value: "string", label: "Строка" },
  { value: "text", label: "Многострочный текст" },
  { value: "richtext", label: "Форматированный текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Переключатель" },
  { value: "url", label: "URL-ссылка" },
  { value: "image", label: "Изображение" },
  { value: "images", label: "Галерея изображений" },
  { value: "select", label: "Выбор из списка" },
  { value: "repeater", label: "Повторяемый блок" },
];
const subFieldTypes = fieldTypes.filter((t) => t.value !== "repeater");

const form = reactive({
  name: "",
  label: "",
  description: "",
  icon: "i-tabler-box",
  category: "none" as "none" | "content" | "project",
});

const fields = ref<FieldInput[]>([]);

function addField() {
  fields.value.push({ name: "", type: "string", label: "", required: true });
}
function removeField(i: number) {
  fields.value.splice(i, 1);
}
function addSubField(parent: FieldInput) {
  if (!parent.subFields) parent.subFields = [];
  parent.subFields.push({ name: "", type: "string", label: "", required: true });
}
function removeSubField(parent: FieldInput, i: number) {
  parent.subFields!.splice(i, 1);
}

function normalizeOptions(opts: string | string[] | undefined): string[] | undefined {
  if (!opts) return undefined;
  if (Array.isArray(opts)) return opts;
  return opts.split(",").map((s) => s.trim()).filter(Boolean);
}

function serializeField(f: FieldInput): FieldInput {
  const out: FieldInput = {
    name: f.name,
    type: f.type,
    label: f.label,
    required: f.required,
  };
  if (f.description) out.description = f.description;
  if (f.type === "select") {
    const opts = normalizeOptions(f.options);
    if (opts) out.options = opts;
  }
  if (f.type === "repeater") {
    if (f.minItems !== undefined) out.minItems = Number(f.minItems);
    if (f.maxItems !== undefined) out.maxItems = Number(f.maxItems);
    if (f.subFields?.length) out.subFields = f.subFields.map(serializeField);
  }
  return out;
}

const createMutation = useMutation({
  mutationFn: (payload: object) => $orpcClient.dev.blocks.create(payload),
  onSuccess: () => {
    toast.add({ title: "Блок создан", description: "Vite HMR подхватит новые файлы", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
    router.push("/dev/blocks");
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка создания", description: err.message, color: "error" });
  },
});

function submit() {
  const payload = {
    name: form.name,
    label: form.label,
    description: form.description,
    icon: form.icon,
    ...(form.category !== "none" ? { category: form.category } : {}),
    fields: fields.value.map(serializeField),
  };
  createMutation.mutate(payload);
}

const canSubmit = computed(() => {
  if (!form.name || !form.label || !form.description || !form.icon) return false;
  if (!fields.value.length) return false;
  return fields.value.every((f) => f.name && f.label);
});
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/blocks" icon="i-tabler-arrow-left" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">Новый блок</h1>
    </div>

    <div class="space-y-4">
      <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Имя (kebab-case)" required hint="Например: hero-fullscreen">
            <UInput v-model="form.name" placeholder="block-name" />
          </UFormField>
          <UFormField label="Label (RU)" required>
            <UInput v-model="form.label" placeholder="Название блока" />
          </UFormField>
        </div>
        <UFormField label="Описание" required>
          <UInput v-model="form.description" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Иконка (i-tabler-*)" required>
            <UInput v-model="form.icon" />
          </UFormField>
          <UFormField label="Категория">
            <USelect
              v-model="form.category"
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
          <UButton icon="i-tabler-plus" size="sm" variant="soft" @click="addField">
            Добавить поле
          </UButton>
        </div>

        <p v-if="!fields.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
          У блока должно быть хотя бы одно поле
        </p>

        <div v-else class="space-y-3">
          <div
            v-for="(field, i) in fields"
            :key="i"
            class="p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/30"
          >
            <div class="flex items-start gap-2">
              <div class="flex-1 grid grid-cols-2 gap-2">
                <UInput v-model="field.name" placeholder="name (camelCase)" size="sm" />
                <UInput v-model="field.label" placeholder="Label" size="sm" />
                <USelect v-model="field.type" :items="fieldTypes" size="sm" class="w-full" />
                <div class="flex items-center gap-2">
                  <USwitch v-model="field.required" />
                  <span class="text-xs">обязательное</span>
                </div>

                <UInput
                  v-if="field.type === 'select'"
                  :model-value="Array.isArray(field.options) ? field.options.join(', ') : field.options"
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
                icon="i-tabler-trash"
                size="xs"
                color="error"
                variant="ghost"
                @click="removeField(i)"
              />
            </div>

            <div v-if="field.type === 'repeater'" class="mt-3 pl-3 border-l-2 border-(--ui-border)">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-(--ui-text-muted)">Под-поля repeater'а</span>
                <UButton icon="i-tabler-plus" size="xs" variant="ghost" @click="addSubField(field)">
                  Под-поле
                </UButton>
              </div>
              <div v-if="field.subFields?.length" class="space-y-2">
                <div
                  v-for="(sf, si) in field.subFields"
                  :key="si"
                  class="flex items-start gap-2"
                >
                  <div class="flex-1 grid grid-cols-2 gap-2">
                    <UInput v-model="sf.name" placeholder="name" size="xs" />
                    <UInput v-model="sf.label" placeholder="Label" size="xs" />
                    <USelect v-model="sf.type" :items="subFieldTypes" size="xs" class="w-full" />
                    <div class="flex items-center gap-2">
                      <USwitch v-model="sf.required" />
                      <span class="text-xs">обязательное</span>
                    </div>
                  </div>
                  <UButton
                    icon="i-tabler-x"
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

      <div class="flex justify-end gap-2">
        <UButton to="/dev/blocks" variant="ghost">Отмена</UButton>
        <UButton
          color="primary"
          :disabled="!canSubmit"
          :loading="createMutation.isPending.value"
          @click="submit"
        >
          Создать блок
        </UButton>
      </div>
    </div>
  </div>
</template>
