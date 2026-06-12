import type { MaybeRefOrGetter } from "vue";

/**
 * Рендерит JSON-LD в <head>. Принимает getter: null/undefined → тег не выводится.
 * `<` экранируется, чтобы данные из БД не могли закрыть <script>.
 */
export function useJsonLd(data: MaybeRefOrGetter<object | null | undefined>) {
  useHead(() => {
    const value = toValue(data);
    if (!value) return {};
    return {
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify(value).replace(/</g, "\\u003c"),
        },
      ],
    };
  });
}
