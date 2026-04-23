<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

const form = ref({ slug: "", name: "", customDomain: "" });

watchEffect(() => {
  if (data.value) {
    form.value = {
      slug: data.value.slug,
      name: data.value.name,
      customDomain: data.value.customDomain ?? "",
    };
  }
});

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.update({
      id: id.value,
      slug: form.value.slug.trim(),
      name: form.value.name.trim(),
      customDomain: form.value.customDomain.trim() || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center gap-3">
      <UButton variant="ghost" icon="i-tabler-arrow-left" @click="router.push('/sites')" />
      <h1 class="text-2xl font-bold">{{ data?.name ?? "Сайт" }}</h1>
      <UBadge v-if="data?.isPrimary" color="primary" variant="subtle" icon="i-tabler-home-star">
        Главный
      </UBadge>
    </div>

    <div v-if="isPending" class="text-(--ui-text-muted)">Загрузка...</div>

    <div v-else-if="data" class="max-w-xl flex flex-col gap-4">
      <UFormField label="Slug (поддомен)" required>
        <UInput v-model="form.slug" :disabled="data.isPrimary" />
      </UFormField>
      <UFormField label="Название" required>
        <UInput v-model="form.name" />
      </UFormField>
      <UFormField label="Свой домен" hint="опционально">
        <UInput v-model="form.customDomain" placeholder="msk-neometria.ru" />
      </UFormField>
      <div>
        <UButton
          :loading="updateMutation.isPending.value"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          @click="updateMutation.mutate()"
        >
          Сохранить
        </UButton>
      </div>
    </div>
  </PageContainer>
</template>
