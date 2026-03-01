import type { CollectionNames } from "../utils.js";
import type { FieldInfo } from "../prompts.js";
import {
  blocksTypeImport,
  generateFormDefaults,
  generateFieldPayloadMapping,
  splitFormTemplates,
} from "./shared.js";

export function generateDetailPageTemplate(
  names: CollectionNames,
  fields: FieldInfo[],
): string {
  const formFields = generateFormDefaults(fields);
  const updateFields = generateFieldPayloadMapping(fields);
  const { formTemplateFields, dynamicBlocksTemplate } =
    splitFormTemplates(fields);

  const wheneverFields = fields
    .map((f) => {
      if (f.type === "dynamic-blocks")
        return `  form.${f.name} = (val.${f.name} as ContentBlock[]) ?? [];`;
      if (f.type === "image")
        return `  form.${f.name} = val.${f.name} ?? null;`;
      if (!f.required && (f.type === "string" || f.type === "textarea"))
        return `  form.${f.name} = val.${f.name} ?? "";`;
      return `  form.${f.name} = val.${f.name};`;
    })
    .join("\n");

  return `<script setup lang="ts">${blocksTypeImport(fields)}
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: item, isPending } = useQuery(
  computed(() =>
    $orpc.${names.camel}.getById.queryOptions({
      input: { id: id.value },
    }),
  ),
);

const form = reactive({
  title: "",
${formFields}
});

whenever(item, (val) => {
  form.title = val.title;
${wheneverFields}
}, { once: true, immediate: true });

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.${names.camel}.update({
      id: id.value,
      title: form.title,
${updateFields}
    }),
  onSuccess: () => {
    toast.add({ title: "${names.singularLabelRu} обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.${names.camel}.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.${names.camel}.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "${names.singularLabelRu} удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.${names.camel}.key() });
    router.push("/${names.kebab}");
  },
});
<` + `/script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="item">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/${names.kebab}">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.title || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-tabler-trash"
            class="rounded-xl"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>

      <div class="space-y-3">
        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <UFormField label="Название" required>
            <UInput
              v-model="form.title"
              placeholder="Введите название"
              size="lg"
            />
          </UFormField>

${formTemplateFields}
        </div>
${dynamicBlocksTemplate ? "\n" + dynamicBlocksTemplate : ""}
      </div>
    </template>
  </PageContainer>
</template>
`;
}
