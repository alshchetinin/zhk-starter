import { defineErrorCatalog } from "evlog";

// Доменные ошибки приложения. Каждая несёт why/fix/link для AI-читаемости.
// Бросаются из oRPC-процедур; evlog/orpc middleware мостит их в ORPCError.
export const appErrors = defineErrorCatalog("app", {
  NOT_FOUND: {
    status: 404,
    message: ({ entity }: { entity: string }) => `${entity} не найден`,
    why: "Запись отсутствует в текущем сайте/скоупе либо удалена",
    fix: "Проверьте id и siteId; запись могла быть удалена каскадом",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Слишком много запросов",
    why: "Превышен лимит на горячей ручке (rate-limit middleware)",
    fix: "Повторите позже; при ложных срабатываниях см. docs/rate-limiting.md",
    link: "docs/rate-limiting.md",
  },
  SITE_LOCKED: {
    status: 403,
    message: "Сайт под паролем или неактивен",
    why: "Сайт неактивен или требует разблокировки по паролю",
    fix: "Активируйте сайт или передайте валидный site-unlock cookie",
  },
});
