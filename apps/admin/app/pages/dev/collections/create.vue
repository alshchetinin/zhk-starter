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
}

const fieldTypes = [
  { value: "string", label: "Строка" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Переключатель" },
  { value: "image", label: "Изображение" },
  { value: "images", label: "Галерея" },
  { value: "dynamic-blocks", label: "Динамические блоки (контент)" },
];

const alwaysOptional = new Set(["boolean", "images", "dynamic-blocks"]);

const form = reactive({
  kebab: "",
  labelRu: "",
  singularLabelRu: "",
  icon: "i-tabler-stack-2",
});

const fields = ref<FieldInput[]>([]);

function addField() {
  fields.value.push({ name: "", type: "string", label: "", required: true });
}
function removeField(i: number) {
  fields.value.splice(i, 1);
}

const createMutation = useMutation({
  mutationFn: (payload: object) => $orpcClient.dev.collections.create(payload),
  onSuccess: (res) => {
    toast.add({
      title: "Коллекция создана",
      description: res.dbPushWarning ?? "Vite HMR подхватит новые файлы",
      color: res.dbPushWarning ? "warning" : "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.collections.key() });
    router.push("/dev/collections");
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка создания", description: err.message, color: "error" });
  },
});

function submit() {
  createMutation.mutate({
    kebab: form.kebab,
    labelRu: form.labelRu,
    singularLabelRu: form.singularLabelRu,
    icon: form.icon,
    fields: fields.value.map((f) => ({
      name: f.name,
      type: f.type,
      label: f.label,
      required: alwaysOptional.has(f.type) ? false : f.required,
    })),
  });
}

const canSubmit = computed(() => {
  if (!form.kebab || !form.labelRu || !form.singularLabelRu || !form.icon) return false;
  return fields.value.every((f) => f.name && f.label);
});
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/collections" icon="i-tabler-arrow-left" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">Новая коллекция</h1>
    </div>

    <div class="space-y-4">
      <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) space-y-3">
        <UFormField label="Имя (kebab-case)" required hint="Например: team-members">
          <UInput v-model="form.kebab" placeholder="collection-name" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Название (мн.ч., RU)" required hint="Команда, Новости...">
            <UInput v-model="form.labelRu" />
          </UFormField>
          <UFormField label="Название (ед.ч., RU)" required hint="Член команды, Новость...">
            <UInput v-model="form.singularLabelRu" />
          </UFormField>
        </div>
        <UFormField label="Иконка (i-tabler-*)" required>
          <UInput v-model="form.icon" />
        </UFormField>
        <p class="text-xs text-(--ui-text-muted)">
          У всех коллекций автоматически есть поле <code>title</code>. Ниже — дополнительные поля.
        </p>
      </div>

      <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg)">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-medium">Дополнительные поля</h2>
          <UButton icon="i-tabler-plus" size="sm" variant="soft" @click="addField">
            Добавить поле
          </UButton>
        </div>

        <p v-if="!fields.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
          Только title — можно не добавлять, сразу создать
        </p>

        <div v-else class="space-y-3">
          <div
            v-for="(field, i) in fields"
            :key="i"
            class="p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/30 flex items-start gap-2"
          >
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UInput v-model="field.name" placeholder="name (camelCase)" size="sm" />
              <UInput v-model="field.label" placeholder="Label" size="sm" />
              <USelect v-model="field.type" :items="fieldTypes" size="sm" class="w-full" />
              <div v-if="!alwaysOptional.has(field.type)" class="flex items-center gap-2">
                <USwitch v-model="field.required" />
                <span class="text-xs">обязательное</span>
              </div>
              <div v-else class="text-xs text-(--ui-text-muted) self-center">
                Всегда с дефолтом
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
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <UButton to="/dev/collections" variant="ghost">Отмена</UButton>
        <UButton
          color="primary"
          :disabled="!canSubmit"
          :loading="createMutation.isPending.value"
          @click="submit"
        >
          Создать коллекцию
        </UButton>
      </div>
    </div>
  </div>
</template>
