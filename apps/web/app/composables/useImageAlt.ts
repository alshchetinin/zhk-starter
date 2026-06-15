import type { MaybeRefOrGetter } from "vue";

export function useAltMap() {
  return useState<Record<string, string>>("alt-map", () => ({}));
}

/** Центральный alt для url (или undefined). url может быть ref/getter. */
export function useImageAlt(url: MaybeRefOrGetter<string>) {
  const map = useAltMap();
  return computed(() => {
    const key = toValue(url);
    return key ? map.value[key] : undefined;
  });
}
