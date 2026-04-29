import type { TrackingEvent } from "@zhk/api/shared/tracking";

/**
 * Точка расширения для аналитических провайдеров.
 *
 * Чтобы добавить новый провайдер (Google Analytics, Top.Mail.Ru, кастомный
 * пиксель и т.п.):
 *   1. Реализуйте интерфейс TrackingProvider — функция `send` отправляет
 *      событие в SDK провайдера. Используйте `gate.analytics.<provider>` для
 *      настроек, заранее расширив `SiteSettings.analytics` в schema.
 *   2. Зарегистрируйте провайдер в массиве `TRACKING_PROVIDERS` ниже.
 *   3. Подключите загрузку SDK провайдера в Nuxt-плагине по аналогии с
 *      `apps/web/app/plugins/yandex-metrika.ts`.
 *
 * Провайдер не должен ничего делать, если соответствующая настройка пуста —
 * `send` просто завершается без ошибок.
 */
export interface TrackingProvider {
  name: string;
  send(
    gate: ReturnType<typeof useSiteGate>["value"],
    event: TrackingEvent,
    params?: Record<string, unknown>,
  ): void;
}

const yandexMetrikaProvider: TrackingProvider = {
  name: "yandex-metrika",
  send(gate, event, params) {
    if (typeof window === "undefined") return;
    const counterId = gate?.analytics?.yandexMetrika?.counterId;
    if (!counterId) return;
    if (typeof window.ym !== "function") return;
    window.ym(counterId, "reachGoal", event, params);
  },
};

export const TRACKING_PROVIDERS: TrackingProvider[] = [yandexMetrikaProvider];
