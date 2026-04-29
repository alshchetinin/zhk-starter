import type { SocialLinkType } from "@zhk/api/shared/socials";
import { TRACKING_EVENTS, type TrackingEvent } from "@zhk/api/shared/tracking";
import { TRACKING_PROVIDERS } from "~/utils/tracking-providers";

/**
 * Bus трекинговых событий для всех аналитических провайдеров сайта.
 *
 * Использование:
 *   const { track, trackFormSubmit, trackPhoneClick, trackMessengerClick } = useTracking()
 *   track('form_submit', { form: 'callback' })
 *
 * Новые события добавляются в реестр `TRACKING_EVENTS` в
 * `packages/api/src/shared/tracking.ts` — `track()` сразу получает новый ключ
 * с автокомплитом, админка автоматически показывает событие в таблице целей.
 */
export function useTracking() {
  const gate = useSiteGate();

  function track(event: TrackingEvent, params?: Record<string, unknown>) {
    if (import.meta.dev) {
      const meta = TRACKING_EVENTS[event];
      console.info(`[tracking] ${event} — ${meta.title}`, params ?? {});
    }

    for (const provider of TRACKING_PROVIDERS) {
      try {
        provider.send(gate.value, event, params);
      } catch (err) {
        if (import.meta.dev) {
          console.warn(`[tracking] provider "${provider.name}" failed:`, err);
        }
      }
    }
  }

  return {
    track,
    trackFormSubmit: (form?: string) =>
      track("form_submit", form ? { form } : undefined),
    trackPhoneClick: (phone?: string) =>
      track("phone_click", phone ? { phone } : undefined),
    trackMessengerClick: (messenger: SocialLinkType) =>
      track("messenger_click", { messenger }),
  };
}
