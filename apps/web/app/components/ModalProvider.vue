<script setup lang="ts">
import { vMaska } from "maska/vue";
import { Motion } from "motion-v";
import type { ModalField } from "@zhk/api/shared/modal-fields";

const { activeModalSlug, close } = useModalAction();
const { $orpcClient } = useNuxtApp();
const { trackFormSubmit } = useTracking();

const dialogOpen = ref(false);
const showErrors = ref(false);

const modalData = ref<{
  title: string;
  description: string | null;
  image: string | null;
  successMessage: string | null;
  fields: ModalField[] | null;
} | null>(null);

const formValues = ref<Record<string, string | boolean>>({});
const isLoading = ref(false);

type SubmitState = "idle" | "submitting" | "submitted" | "success";
const submitState = ref<SubmitState>("idle");
const submitError = ref<string | null>(null);
const checkDrawn = ref(false);

let submitTimers: ReturnType<typeof setTimeout>[] = [];

function clearSubmitTimers() {
  submitTimers.forEach(clearTimeout);
  submitTimers = [];
}

const DEFAULT_PHONE_MASK = "+7 (###) ###-##-##";

const FALLBACK_FIELDS: ModalField[] = [
  { id: "fallback-name", type: "name", label: "Имя", placeholder: "Имя", required: true },
  { id: "fallback-phone", type: "phone", label: "Телефон", placeholder: DEFAULT_PHONE_MASK, required: true },
];

const effectiveFields = computed<ModalField[]>(() => {
  return modalData.value?.fields?.length ? modalData.value.fields : FALLBACK_FIELDS;
});

const fieldErrors = computed(() => {
  if (!showErrors.value) return {};
  const errors: Record<string, string> = {};
  for (const field of effectiveFields.value) {
    const val = formValues.value[field.id];
    if (!field.required) continue;
    if (field.type === "checkbox") {
      if (!val) errors[field.id] = "Обязательное поле";
    } else {
      if (!val || (typeof val === "string" && !val.trim())) {
        errors[field.id] = "Обязательное поле";
      } else if (field.type === "email" && typeof val === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.id] = "Некорректный email";
      }
    }
  }
  return errors;
});

const isValid = computed(() => Object.keys(fieldErrors.value).length === 0);

function resetForm() {
  clearSubmitTimers();
  formValues.value = {};
  submitState.value = "idle";
  submitError.value = null;
  showErrors.value = false;
  checkDrawn.value = false;
}

watch(activeModalSlug, async (slug) => {
  if (!slug) {
    dialogOpen.value = false;
    return;
  }

  resetForm();
  modalData.value = null;
  isLoading.value = true;
  dialogOpen.value = true;

  try {
    const data = await $orpcClient.public.modals.getBySlug({ slug });
    modalData.value = {
      title: data.title,
      description: data.description,
      image: data.image,
      successMessage: data.successMessage,
      fields: (data.fields as ModalField[] | null) ?? null,
    };
  } catch {
    modalData.value = null;
  } finally {
    isLoading.value = false;
  }
}, { immediate: true });

watch(dialogOpen, (open) => {
  if (!open) {
    resetForm();
    close();
  }
});

function getFieldValue(field: ModalField) {
  return formValues.value[field.id] ?? (field.type === "checkbox" ? false : "");
}

function setFieldValue(field: ModalField, value: string | boolean | "indeterminate") {
  formValues.value[field.id] = value === "indeterminate" ? false : value;
}

function collectFields() {
  const fields: { key: string; type: string; label: string; value: string | boolean }[] = [];
  for (const field of effectiveFields.value) {
    const raw = formValues.value[field.id];
    if (field.type === "checkbox") {
      if (raw === true) fields.push({ key: field.id, type: field.type, label: field.label, value: true });
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    fields.push({ key: field.id, type: field.type, label: field.label, value });
  }
  return fields;
}

async function handleSubmit() {
  showErrors.value = true;
  if (!isValid.value) return;
  submitState.value = "submitting";
  submitError.value = null;
  clearSubmitTimers();

  try {
    const fields = collectFields();
    await $orpcClient.public.tickets.create({
      fields,
      type: "callback",
      source: `modal:${activeModalSlug.value ?? ""}`,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
    trackFormSubmit(activeModalSlug.value ?? undefined);
    submitTimers.push(setTimeout(() => {
      submitState.value = "submitted";
      submitTimers.push(setTimeout(() => {
        submitState.value = "success";
        submitTimers.push(setTimeout(() => {
          checkDrawn.value = true;
        }, 300));
      }, 150));
    }, 400));
  } catch (err) {
    console.error("[modal] submit failed", err);
    submitState.value = "idle";
    const e = err as { status?: number; code?: string; data?: { retryAfterSec?: number } };
    if (e?.status === 429 || e?.code === "TOO_MANY_REQUESTS") {
      const sec = e?.data?.retryAfterSec ?? 60;
      submitError.value = `Слишком много попыток. Повторите через ${sec} сек.`;
    } else {
      submitError.value = "Не удалось отправить заявку. Проверьте поля и попробуйте ещё раз.";
    }
  }
}

onBeforeUnmount(clearSubmitTimers);

const inputClass = "w-full rounded-xl border bg-transparent px-5 py-3.5 text-sm text-[var(--web-text-primary)] placeholder:text-[var(--web-text-muted)] outline-none transition-colors";
const inputNormalClass = "border-[var(--web-border)] focus:border-[var(--web-accent)] focus:ring-1 focus:ring-[var(--web-accent)]/20";
const inputErrorClass = "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200";

function inputClasses(fieldId: string) {
  return [inputClass, fieldErrors.value[fieldId] ? inputErrorClass : inputNormalClass];
}

const errorTransitionProps = {
  enterActiveClass: "transition-all duration-200 ease-out",
  leaveActiveClass: "transition-all duration-150 ease-in",
  enterFromClass: "opacity-0 -translate-y-1 max-h-0",
  enterToClass: "opacity-100 translate-y-0 max-h-6",
  leaveFromClass: "opacity-100 translate-y-0 max-h-6",
  leaveToClass: "opacity-0 -translate-y-1 max-h-0",
};
</script>

<template>
  <UiDialog v-model:open="dialogOpen">
    <UiDialogContent :show-close="false">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Icon name="lucide:loader-2" class="size-6 animate-spin text-[var(--web-text-muted)]" />
      </div>

      <template v-else-if="modalData">
        <Transition
          enter-active-class="transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="submitState === 'success'" class="flex flex-col items-center py-10">
            <div class="relative mb-5 flex size-16 items-center justify-center">
              <Motion
                :initial="{ scale: 0, opacity: 0 }"
                :animate="{ scale: 1, opacity: 1 }"
                :transition="{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }"
                class="absolute inset-0 rounded-full bg-[var(--web-accent)]"
              />
              <svg class="relative z-10 size-8" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 12.5L10 16.5L18 8.5"
                  stroke="var(--web-text-inverse, #fff)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="check-path"
                  :class="checkDrawn ? 'drawn' : ''"
                />
              </svg>
            </div>
            <Motion
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.4, delay: 0.35 }"
              tag="p"
              class="text-lg font-semibold text-[var(--web-text-primary)] text-center px-4"
            >
              {{ modalData.successMessage || "Спасибо! Мы свяжемся с вами." }}
            </Motion>
          </div>
        </Transition>

        <Transition
          leave-active-class="transition-all duration-300 ease-[cubic-bezier(0.4,0,1,1)]"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-4 scale-[0.97]"
        >
          <div v-if="submitState === 'idle' || submitState === 'submitting'">
            <div v-if="modalData.image" class="relative -mx-6 -mt-6 mb-6">
              <img
                :src="modalData.image"
                :alt="modalData.title"
                class="block h-48 w-full object-cover rounded-t-2xl"
              />
              <DialogClose
                class="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-gray-700 hover:bg-white backdrop-blur-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--web-accent)]"
              >
                <Icon name="lucide:x" class="size-4" />
              </DialogClose>
            </div>

            <DialogClose
              v-else
              class="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-[var(--web-text-muted)] hover:text-[var(--web-text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--web-accent)]"
            >
              <Icon name="lucide:x" class="size-4" />
            </DialogClose>

            <div class="space-y-1.5">
              <h2 class="text-xl font-bold text-[var(--web-text-primary)] pr-8">
                {{ modalData.title }}
              </h2>
              <p
                v-if="modalData.description"
                class="text-sm text-[var(--web-text-secondary)]"
              >
                {{ modalData.description }}
              </p>
            </div>

            <form class="mt-6 space-y-4" novalidate @submit.prevent="handleSubmit">
              <template v-for="field in effectiveFields" :key="field.id">
                <div v-if="field.type === 'phone'">
                  <input
                    v-maska
                    type="tel"
                    :data-maska="field.mask || DEFAULT_PHONE_MASK"
                    :placeholder="field.placeholder || field.mask || DEFAULT_PHONE_MASK"
                    :value="getFieldValue(field)"
                    :class="inputClasses(field.id)"
                    @maska="setFieldValue(field, ($event.target as HTMLInputElement).value)"
                  />
                  <Transition v-bind="errorTransitionProps">
                    <p v-if="fieldErrors[field.id]" class="mt-1.5 text-xs text-red-500">
                      {{ fieldErrors[field.id] }}
                    </p>
                  </Transition>
                </div>

                <div v-else-if="field.type === 'name' || field.type === 'email'">
                  <input
                    :type="field.type === 'email' ? 'email' : 'text'"
                    :placeholder="field.placeholder || field.label"
                    :value="getFieldValue(field)"
                    :class="inputClasses(field.id)"
                    @input="setFieldValue(field, ($event.target as HTMLInputElement).value)"
                  />
                  <Transition v-bind="errorTransitionProps">
                    <p v-if="fieldErrors[field.id]" class="mt-1.5 text-xs text-red-500">
                      {{ fieldErrors[field.id] }}
                    </p>
                  </Transition>
                </div>

                <div v-else-if="field.type === 'description'">
                  <textarea
                    :placeholder="field.placeholder || field.label"
                    :value="getFieldValue(field) as string"
                    :rows="3"
                    :class="[...inputClasses(field.id), 'resize-none']"
                    @input="setFieldValue(field, ($event.target as HTMLTextAreaElement).value)"
                  />
                  <Transition v-bind="errorTransitionProps">
                    <p v-if="fieldErrors[field.id]" class="mt-1.5 text-xs text-red-500">
                      {{ fieldErrors[field.id] }}
                    </p>
                  </Transition>
                </div>

                <div v-else-if="field.type === 'checkbox'">
                  <div class="flex items-start gap-3">
                    <CheckboxRoot
                      :model-value="!!getFieldValue(field)"
                      class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer"
                      :class="fieldErrors[field.id]
                        ? 'border-red-400'
                        : getFieldValue(field)
                          ? 'border-[var(--web-accent)] bg-[var(--web-accent)]'
                          : 'border-[var(--web-border)] bg-[var(--web-bg)] hover:border-[var(--web-border-hover,var(--web-border))]'"
                      @update:model-value="setFieldValue(field, $event)"
                    >
                      <CheckboxIndicator class="flex items-center justify-center">
                        <Icon name="lucide:check" class="size-3.5 text-[var(--web-text-inverse,#fff)]" />
                      </CheckboxIndicator>
                    </CheckboxRoot>
                    <span
                      class="text-sm leading-snug text-[var(--web-text-secondary)] cursor-pointer select-none [&_a]:text-[var(--web-accent)] [&_a]:underline [&_a]:hover:no-underline"
                      v-html="field.label"
                      @click="setFieldValue(field, !getFieldValue(field))"
                    />
                  </div>
                  <Transition v-bind="errorTransitionProps">
                    <p v-if="fieldErrors[field.id]" class="mt-1.5 ml-8 text-xs text-red-500">
                      {{ fieldErrors[field.id] }}
                    </p>
                  </Transition>
                </div>
              </template>

              <button
                type="submit"
                class="!mt-6 w-full rounded-xl bg-[var(--web-accent)] px-5 py-3.5 text-sm font-semibold text-[var(--web-text-inverse,#fff)] transition-opacity hover:opacity-90 disabled:opacity-60"
                :disabled="submitState === 'submitting'"
              >
                <span v-if="submitState === 'submitting'" class="flex items-center justify-center gap-2">
                  <Icon name="lucide:loader-2" class="size-4 animate-spin" />
                  Отправка...
                </span>
                <span v-else>Отправить</span>
              </button>

              <p v-if="submitError" class="!mt-2 text-sm text-red-500">{{ submitError }}</p>
            </form>

            <p class="mt-4 text-center text-[11px] leading-tight text-[var(--web-text-muted)]">
              Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
            </p>
          </div>
        </Transition>
      </template>

      <div v-else class="py-6 text-center text-sm text-[var(--web-text-muted)]">
        Не удалось загрузить данные
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<style scoped>
.check-path {
  stroke-dasharray: 28;
  stroke-dashoffset: 28;
  transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.35, 1) 0s;
}
.check-path.drawn {
  stroke-dashoffset: 0;
}
</style>
