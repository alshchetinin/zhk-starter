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
    <UBreadcrumb
      :items="[
        { label: 'Проекты', to: '/projects', icon: 'i-tabler-building' },
        { label: 'Новый ЖК' },
      ]"
      class="mb-6"
    />

    <h1 class="text-2xl font-bold mb-6">Новый ЖК</h1>

    <div class="max-w-2xl space-y-4">
      <UFormField label="Название" required>
        <UInput v-model="form.name" placeholder="ЖК «Солнечный»" />
      </UFormField>
      <UFormField label="Адрес">
        <UInput v-model="form.address" placeholder="ул. Пушкина, 10" />
      </UFormField>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Город">
          <USelect v-model="form.cityId" :items="cityItems" placeholder="—" />
        </UFormField>
        <UFormField label="Статус" required>
          <USelect v-model="form.status" :items="statusItems" />
        </UFormField>
      </div>
      <UFormField label="Координаты" hint="широта,долгота">
        <UInput v-model="form.coordinates" placeholder="55.7558,37.6173" />
      </UFormField>
      <UFormField label="Район / расположение">
        <UInput v-model="form.location" placeholder="Центр города" />
      </UFormField>

      <div class="flex gap-2 pt-2">
        <UButton variant="outline" class="rounded-xl" @click="router.push('/projects')">
          Отмена
        </UButton>
        <UButton
          :loading="createMut.isPending.value"
          :disabled="!form.name.trim()"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          @click="submit"
        >
          Создать
        </UButton>
      </div>
    </div>
  </PageContainer>
</template>
