<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();

const { data: cities } = useQuery($orpc.cities.list.queryOptions());

const cityItems = computed(() =>
  (cities.value ?? []).map((c: any) => ({ label: c.name, value: c.id })),
);

const statusItems = [
  { label: "В планировании", value: "planning" },
  { label: "Активный", value: "active" },
  { label: "Завершён", value: "completed" },
  { label: "Скрыт", value: "hidden" },
];

const form = reactive({
  name: "",
  address: "",
  cityId: "" as string,
  status: "planning" as "active" | "completed" | "planning" | "hidden",
  coordinates: "",
  location: "",
});

const createMut = useMutation({
  mutationFn: () =>
    $orpcClient.projects.create({
      name: form.name.trim(),
      address: form.address.trim(),
      status: form.status,
      cityId: form.cityId || null,
      coordinates: form.coordinates.trim() || null,
      location: form.location.trim() || null,
    }),
  onSuccess: (created) => {
    toast.add({ title: "ЖК создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
    router.push(`/projects/${created.id}/edit`);
  },
});

function submit() {
  if (!form.name.trim()) return;
  createMut.mutate();
}
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Новый ЖК"
      back="/projects"
      :crumbs="[{ label: 'Проекты', to: '/projects' }, { label: 'Новый ЖК' }]"
    />

    <AppDataCard class="max-w-2xl">
      <div class="space-y-4">
        <UFormField label="Название" required>
          <UInput v-model="form.name" placeholder="ЖК «Солнечный»" size="sm" />
        </UFormField>
        <UFormField label="Адрес">
          <UInput v-model="form.address" placeholder="ул. Пушкина, 10" size="sm" />
        </UFormField>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Город">
            <USelect v-model="form.cityId" :items="cityItems" placeholder="—" size="sm" />
          </UFormField>
          <UFormField label="Статус" required>
            <USelect v-model="form.status" :items="statusItems" size="sm" />
          </UFormField>
        </div>
        <UFormField label="Координаты" hint="широта,долгота">
          <UInput v-model="form.coordinates" placeholder="55.7558,37.6173" size="sm" />
        </UFormField>
        <UFormField label="Район / расположение">
          <UInput v-model="form.location" placeholder="Центр города" size="sm" />
        </UFormField>

        <div class="flex gap-2 pt-2 border-t border-(--ui-border) -mx-4 px-4 -mb-4 pb-4 mt-6">
          <UButton variant="outline" @click="router.push('/projects')">
            Отмена
          </UButton>
          <UButton
            color="primary"
            icon="i-tabler-plus"
            :loading="createMut.isPending.value"
            :disabled="!form.name.trim()"
            @click="submit"
          >
            Создать
          </UButton>
        </div>
      </div>
    </AppDataCard>
  </PageContainer>
</template>
