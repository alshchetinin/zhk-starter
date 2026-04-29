import type { SiteAnalyticsSettings, YandexMetrikaSettings } from "@zhk/db/schema";

export type { SiteAnalyticsSettings, YandexMetrikaSettings };

/**
 * Единый реестр трекинговых событий проекта.
 *
 * Чтобы добавить новое событие — добавьте запись сюда. Всё остальное (типы,
 * таблица в админке, dev-логи, отправка в провайдеры) подхватится автоматически.
 *
 * Имя события (ключ) попадает прямо в Метрику как `reachGoal('<имя>')` — это же
 * имя пользователь должен указать при создании цели в кабинете Метрики
 * (тип цели — «JavaScript-событие»).
 */

export type TrackingEventCategory = "lead" | "engagement" | "navigation";

export interface TrackingEventMeta {
  title: string;
  description: string;
  category: TrackingEventCategory;
}

export const TRACKING_EVENTS = {
  form_submit: {
    title: "Отправка формы заявки",
    description: "Любая форма заявки на сайте: модалки «Заказать звонок», «Записаться на просмотр» и т.д.",
    category: "lead",
  },
  phone_click: {
    title: "Клик по телефону",
    description: "Клик по ссылке tel: в шапке, подвале или блоке контактов",
    category: "lead",
  },
  messenger_click: {
    title: "Клик по мессенджеру",
    description: "Клик по иконке WhatsApp / Telegram в подвале или блоке контактов",
    category: "lead",
  },
} as const satisfies Record<string, TrackingEventMeta>;

export type TrackingEvent = keyof typeof TRACKING_EVENTS;

export const TRACKING_EVENT_LIST = (
  Object.entries(TRACKING_EVENTS) as [TrackingEvent, TrackingEventMeta][]
).map(([name, meta]) => ({ name, ...meta }));

export const TRACKING_CATEGORY_LABELS: Record<TrackingEventCategory, string> = {
  lead: "Лиды",
  engagement: "Вовлечение",
  navigation: "Навигация",
};

export interface TrackingEventGroup {
  category: TrackingEventCategory;
  label: string;
  items: typeof TRACKING_EVENT_LIST;
}

export const TRACKING_EVENT_GROUPS: TrackingEventGroup[] = (() => {
  const groups = new Map<TrackingEventCategory, typeof TRACKING_EVENT_LIST>();
  for (const ev of TRACKING_EVENT_LIST) {
    const arr = groups.get(ev.category) ?? [];
    arr.push(ev);
    groups.set(ev.category, arr);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    label: TRACKING_CATEGORY_LABELS[category],
    items,
  }));
})();

export const METRIKA_COUNTER_ID_REGEX = /^\d{6,9}$/;
