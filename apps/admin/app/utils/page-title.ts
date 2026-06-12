export interface NavTitleItem {
  label: string;
  to: string;
}

/**
 * Подбирает тайтл страницы по пунктам навигации.
 *
 * Правила:
 * - пункт `to: "/"` матчится только при `path === "/"`;
 * - остальные — префиксное совпадение по границе сегмента
 *   (`path === to` или `path.startsWith(to + "/")`);
 * - из совпавших побеждает самый длинный `to`;
 * - нет совпадений → `null`.
 */
export function matchNavTitle(
  path: string,
  items: ReadonlyArray<NavTitleItem>,
): string | null {
  let best: NavTitleItem | null = null;
  for (const item of items) {
    if (item.to === "/") {
      if (path === "/" && best === null) best = item;
      continue;
    }
    if (path === item.to || path.startsWith(item.to + "/")) {
      if (best === null || item.to.length > best.to.length) best = item;
    }
  }
  return best ? best.label : null;
}
