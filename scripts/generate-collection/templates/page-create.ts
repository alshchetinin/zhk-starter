import type { CollectionNames } from "../utils.js";
import type { FieldInfo } from "../prompts.js";
import {
  blocksTypeImport,
  generateFormDefaults,
  generateFieldPayloadMapping,
  splitFormTemplates,
} from "./shared.js";

export function generateCreatePageTemplate(
  names: CollectionNames,
  fields: FieldInfo[],
): string {
  const formFields = generateFormDefaults(fields);
  const createFields = generateFieldPayloadMapping(fields);
  const { formTemplateFields, dynamicBlocksTemplate } =
    splitFormTemplates(fields);

  return `<script setup lang="ts">${blocksTypeImport(fields)}
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const form = reactive({
  title: "",
${formFields}
});

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.${names.camel}.create({
      title: form.title,
${createFields}
    }),
  onSuccess: (data) => {
    toast.add({ title: "${names.singularLabelRu} создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.${names.camel}.key() });
    router.push(\`/${names.kebab}/\${data.id}\`);
  },
});
<` + `/script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/${names.kebab}">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новый ${names.singularLabelRu.toLowerCase()}</h1>
      </div>
      <UButton
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        :loading="createMutation.isPending.value"
        @click="createMutation.mutate()"
      >
        Сохранить
      </UButton>
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
  </PageContainer>
</template>
`;
}
