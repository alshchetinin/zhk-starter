import { NuxtLink } from "#components";
import type { MaybeRefOrGetter } from "vue";

export function useActionLink(to: MaybeRefOrGetter<string | null | undefined>) {
  const toRef = computed(() => toValue(to) ?? "");
  const isModal = computed(() => toRef.value.startsWith("modal:"));
  const modalSlug = computed(() => toRef.value.replace(/^modal:/, ""));
  const isExternal = computed(() => /^https?:\/\//.test(toRef.value));
  const { open } = useModalAction();

  const tag = computed(() => {
    if (!toRef.value || isModal.value) return "button";
    if (isExternal.value) return "a";
    return NuxtLink;
  });

  const attrs = computed(() => {
    if (!toRef.value || isModal.value) return { type: "button" as const };
    if (isExternal.value) {
      return { href: toRef.value, target: "_blank", rel: "noopener noreferrer" };
    }
    return { to: toRef.value };
  });

  function onClick(event: MouseEvent) {
    if (isModal.value) {
      event.preventDefault();
      open(modalSlug.value);
    }
  }

  return { tag, attrs, onClick, isModal, isExternal, modalSlug };
}
