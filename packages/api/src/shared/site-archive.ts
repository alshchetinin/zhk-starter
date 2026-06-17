/**
 * Чистая логика состояния архивации сайта. Без зависимостей от БД/oRPC —
 * хендлеры роутера резолвят сайт и применяют эти предикаты.
 */

/**
 * Поля сайта для архивных предикатов. `isPrimary` нужен только `canArchiveSite`;
 * `isSiteArchived`/`canRestoreSite` намеренно принимают узкий тип `{ archivedAt }`,
 * чтобы их можно было звать с любым объектом, у которого есть archivedAt.
 */
export interface SiteArchiveFields {
  isPrimary: boolean;
  archivedAt: Date | string | null;
}

/** Сайт в архиве (archivedAt проставлен). */
export function isSiteArchived(site: { archivedAt: Date | string | null }): boolean {
  return site.archivedAt != null;
}

/** Можно ли архивировать: не главный и ещё не в архиве. */
export function canArchiveSite(site: SiteArchiveFields): boolean {
  return !site.isPrimary && !isSiteArchived(site);
}

/** Можно ли восстановить: сайт должен быть в архиве. Намеренный псевдоним {@link isSiteArchived} — отдельное имя для ясности «restore» на месте вызова. */
export function canRestoreSite(site: { archivedAt: Date | string | null }): boolean {
  return isSiteArchived(site);
}
