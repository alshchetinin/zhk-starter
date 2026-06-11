<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { ContactFormValue } from "~/components/ContactForm.vue";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();

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

const canSave = computed(() => form.value.label.trim().length > 0);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.contacts.create({
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
    }),
  onSuccess: (created) => {
    toast.add({ title: "Контакт создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.contacts.key() });
    router.push(`/contacts/${created!.id}`);
  },
  onError: () => toast.add({ title: "Ошибка создания", color: "error" }),
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="i-solar-arrow-left-linear" @click="router.push('/contacts')" />
        <h1 class="text-2xl font-bold">Новый контакт</h1>
      </div>
      <UButton
        :disabled="!canSave"
        :loading="createMutation.isPending.value"
        icon="i-solar-diskette-linear"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
        @click="createMutation.mutate()"
      >
        Создать
      </UButton>
    </div>

    <ContactForm v-model="form" />
  </PageContainer>
</template>
