import type { MaybeRefOrGetter } from "vue";
import type { BreadcrumbItem, BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";
import { resolveBreadcrumbs } from "~/utils/breadcrumbs";

export interface UseBreadcrumbsInput {
  current: string;
  parent?: BreadcrumbItem;
  config?: BreadcrumbsConfig | null;
  isHome?: boolean;
}

/** Глобальный state финальной цепочки. null → крошки не рендерятся. */
export function useBreadcrumbsState() {
  return useState<BreadcrumbItem[] | null>("breadcrumbs", () => null);
}

/**
 * Вызывается в setup страницы. Прогоняет вход через resolveBreadcrumbs
 * с site-настройками из gate и пишет итог в state (реактивно).
 */
export function useBreadcrumbs(input: MaybeRefOrGetter<UseBreadcrumbsInput>): void {
  const state = useBreadcrumbsState();
  const gate = useSiteGate();

  watchEffect(() => {
    const value = toValue(input);
    state.value = resolveBreadcrumbs({
      config: value.config,
      auto: { current: value.current, parent: value.parent },
      settings: gate.value?.breadcrumbs,
      isHome: value.isHome,
    });
  });
}
