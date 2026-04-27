<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: section, isPending } = useQuery(
  computed(() =>
    $orpc.sections.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const { data: apartmentsCount } = useQuery(
  computed(() => ({
    ...$orpc.apartments.list.queryOptions({
      input: { sectionId: id.value, page: 1, pageSize: 1 },
    }),
    enabled: !!id.value,
  })),
);

const sunPosition = ref<number>(0);
const hasSunPosition = computed(() => section.value?.sunPosition != null);

watch(
  () => section.value?.sunPosition,
  (val) => {
    sunPosition.value = val ?? 0;
  },
  { immediate: true },
);

const sunMutation = useMutation({
  mutationFn: (value: number | null) =>
    $orpcClient.sections.updateSunPosition({ id: id.value, sunPosition: value }),
  onMutate: async (value) => {
    const queryKey = $orpc.sections.getById.queryKey({ input: { id: id.value } });
    await queryClient.cancelQueries({ queryKey });
    const prev = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old: any) =>
      old ? { ...old, sunPosition: value } : old,
    );
    return { prev };
  },
  onError: (_err, _value, ctx) => {
    if (ctx?.prev) {
      queryClient.setQueryData(
        $orpc.sections.getById.queryKey({ input: { id: id.value } }),
        ctx.prev,
      );
    }
    toast.add({ title: "Не удалось сохранить", color: "error" });
  },
  onSuccess: () => {
    toast.add({ title: "Положение солнца сохранено", color: "success" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
    // Квартиры этой секции включают section в getById — освежим кеш.
    queryClient.invalidateQueries({ queryKey: $orpc.apartments.key() });
  },
});

function saveSun() {
  sunMutation.mutate(sunPosition.value);
}
function resetSun() {
  sunMutation.mutate(null);
}

const deleteOpen = ref(false);
const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.sections.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Секция удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
    queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
    const buildingId = section.value?.buildingId;
    router.push(buildingId ? `/buildings/${buildingId}` : "/buildings");
  },
  onError: (e: any) => {
    toast.add({ title: "Ошибка", description: e.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="section">
      <AppPageHeader
        :title="section.name"
        :crumbs="[
          { label: 'Дома', to: '/buildings' },
          ...(section.building
            ? [{ label: section.building.name, to: `/buildings/${section.building.id}` }]
            : []),
          { label: section.name },
        ]"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            icon="i-tabler-trash"
            label="Удалить"
            @click="deleteOpen = true"
          />
        </template>
      </AppPageHeader>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <AppStatHero label="Этажей" accent="sky">
          <template #value>{{ section.floorsCount ?? "—" }}</template>
        </AppStatHero>
        <AppStatHero label="Квартир" accent="emerald">
          <template #value>{{ apartmentsCount?.total ?? 0 }}</template>
        </AppStatHero>
        <AppStatHero label="Положение солнца" accent="amber">
          <template #value>
            {{ hasSunPosition ? `${section.sunPosition}°` : "—" }}
          </template>
        </AppStatHero>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="lg:col-span-2 space-y-3">
          <AppDataCard v-if="section.masterplanImage" title="Мастер-план">
            <img
              :src="section.masterplanImage"
              class="w-full rounded-md border border-(--ui-border)"
            />
          </AppDataCard>

          <AppDataCard title="Параметры">
            <dl class="text-sm divide-y divide-(--ui-border)">
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Дом</dt>
                <dd class="font-medium">
                  {{ section.building?.name ?? "—" }}
                </dd>
              </div>
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Этажей</dt>
                <dd class="font-medium tabular-nums">
                  {{ section.floorsCount ?? "—" }}
                </dd>
              </div>
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Положение солнца</dt>
                <dd class="font-medium tabular-nums">
                  {{ hasSunPosition ? `${section.sunPosition}°` : "—" }}
                </dd>
              </div>
              <div v-if="section.externalId" class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">External ID</dt>
                <dd class="font-mono text-xs text-(--ui-text-muted) truncate ml-2">
                  {{ section.externalId }}
                </dd>
              </div>
            </dl>
          </AppDataCard>
        </div>

        <div class="space-y-3">
          <AppDataCard title="Положение солнца">
            <p class="text-xs text-(--ui-text-dimmed) mb-3">
              Значение наследуется на все квартиры в этой секции. Можно
              переопределить на конкретной квартире.
            </p>
            <SunPositionSelector v-model="sunPosition" />
            <div class="mt-4 flex items-center gap-2">
              <UButton
                color="primary"
                icon="i-tabler-device-floppy"
                :loading="sunMutation.isPending.value"
                @click="saveSun"
              >
                Сохранить
              </UButton>
              <UButton
                v-if="hasSunPosition"
                color="neutral"
                variant="ghost"
                icon="i-tabler-x"
                :loading="sunMutation.isPending.value"
                @click="resetSun"
              >
                Сбросить
              </UButton>
            </div>
          </AppDataCard>
        </div>
      </div>

      <UModal v-model:open="deleteOpen" title="Удалить секцию?">
        <template #body>
          <p class="text-sm">
            Будут удалены все этажи, входы и квартиры в этой секции. Действие
            необратимо.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="deleteOpen = false">Отмена</UButton>
            <UButton
              color="error"
              :loading="deleteMutation.isPending.value"
              @click="deleteMutation.mutate()"
            >
              Удалить
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
