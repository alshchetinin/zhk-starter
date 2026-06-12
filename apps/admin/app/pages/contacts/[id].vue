<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { ContactFormValue } from "~/components/ContactForm.vue";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.contacts.getById.queryOptions({ input: { id: id.value } })),
);

useHead({ title: computed(() => data.value?.label) });

const form = ref<ContactFormValue>({
  label: "",
  phone: "",
  email: "",
  address: "",
  workingHours: "",
  coordinates: "",
  mapLink: "",
  image: null,
  socials: [],
  tags: [],
  sortOrder: 0,
});

watch(
  data,
  (v) => {
    if (!v) return;
    form.value = {
      label: v.label,
      phone: v.phone ?? "",
      email: v.email ?? "",
      address: v.address ?? "",
      workingHours: v.workingHours ?? "",
      coordinates: v.coordinates ?? "",
      mapLink: v.mapLink ?? "",
      image: v.image ?? null,
      socials: (v.socials ?? []) as ContactFormValue["socials"],
      tags: (v.tags ?? []) as string[],
      sortOrder: v.sortOrder ?? 0,
    };
  },
  { immediate: true },
);

const canSave = computed(() => form.value.label.trim().length > 0);

const updateMutation = useMutation({
  mutationFn: () => {
    const payload = {
      id: id.value,
      label: form.value.label.trim(),
      phone: form.value.phone.trim() || null,
      email: form.value.email.trim() || null,
      address: form.value.address.trim() || null,
      workingHours: form.value.workingHours.trim() || null,
      coordinates: form.value.coordinates.trim() || null,
      mapLink: form.value.mapLink.trim() || null,
      image: form.value.image,
      socials: form.value.socials.filter((s) => s.link.trim()),
      tags: form.value.tags,
      sortOrder: form.value.sortOrder,
    };
    return $orpcClient.contacts.update(payload);
  },
  onMutate: async () => {
    const key = $orpc.contacts.getById.queryKey({ input: { id: id.value } });
    await queryClient.cancelQueries({ queryKey: key });
    const snapshot = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (old: any) => (old ? { ...old, ...form.value } : old));
    return { snapshot, key };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(ctx.key, ctx.snapshot);
    toast.add({ title: "Ошибка сохранения", color: "error" });
  },
  onSuccess: () => toast.add({ title: "Сохранено", color: "success" }),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.contacts.key() });
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="i-solar-arrow-left-linear" @click="router.push('/contacts')" />
        <h1 class="text-2xl font-bold">{{ data?.label ?? "Контакт" }}</h1>
      </div>
      <UButton
        :disabled="!canSave"
        :loading="updateMutation.isPending.value"
        icon="i-solar-diskette-linear"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
        @click="updateMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <div v-if="isPending" class="text-(--ui-text-muted)">Загрузка...</div>
    <ContactForm v-else-if="data" v-model="form" />
  </PageContainer>
</template>
