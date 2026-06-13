import type { MaybeRefOrGetter } from "vue";
import type { PageMetaInput } from "~/utils/seo";

type PageSeoInput = {
  [K in keyof PageMetaInput]: MaybeRefOrGetter<PageMetaInput[K]>;
};

/**
 * Единая точка вывода SEO-мета страницы: title с суффиксом сайта,
 * фолбэки на дефолты из настроек сайта, canonical/og:url по текущему
 * Host (мультитенантно), noindex для закрытых сайтов.
 */
export function usePageSeo(input: PageSeoInput = {}) {
  const gate = useSiteGate();
  const url = useRequestURL();
  const route = useRoute();

  const meta = computed(() =>
    resolvePageMeta(
      {
        title: toValue(input.title),
        description: toValue(input.description),
        ogImage: toValue(input.ogImage),
        type: toValue(input.type),
      },
      {
        seo: gate.value?.seo ?? null,
        siteName: gate.value?.name ?? "",
        origin: url.origin,
        path: route.path,
      },
    ),
  );

  useSeoMeta({
    title: () => meta.value.title,
    description: () => meta.value.description ?? undefined,
    ogTitle: () => meta.value.title,
    ogDescription: () => meta.value.description ?? undefined,
    ogImage: () => meta.value.ogImage ?? undefined,
    ogUrl: () => meta.value.canonical,
    ogType: () => meta.value.ogType,
    ogSiteName: () => meta.value.siteName || undefined,
    twitterCard: "summary_large_image",
    robots: () => meta.value.robots ?? undefined,
  });

  useHead({
    link: [{ rel: "canonical", href: () => meta.value.canonical }],
  });
}
