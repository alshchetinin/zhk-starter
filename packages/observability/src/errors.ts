import { ORPCError } from "@orpc/server";

// Доменные ошибки приложения. Каждая несёт why/fix/code в ORPCError.data для
// AI-читаемости (их читают captureUnexpected → Sentry-теги и клиент). Бросаются
// из oRPC-процедур; ORPCError сам мостит код в HTTP-статус (NOT_FOUND→404 и т.д.).
export const appErrors = {
  NOT_FOUND: ({ entity }: { entity: string }) =>
    new ORPCError("NOT_FOUND", {
      message: `${entity} не найден`,
      data: {
        code: "app.NOT_FOUND",
        why: "Запись отсутствует в текущем сайте/скоупе либо удалена",
        fix: "Проверьте id и siteId; запись могла быть удалена каскадом",
      },
    }),
  RATE_LIMITED: () =>
    new ORPCError("TOO_MANY_REQUESTS", {
      message: "Слишком много запросов",
      data: {
        code: "app.RATE_LIMITED",
        why: "Превышен лимит на горячей ручке",
        fix: "Повторите позже; см. docs/rate-limiting.md",
      },
    }),
  SITE_LOCKED: () =>
    new ORPCError("FORBIDDEN", {
      message: "Сайт под паролем или неактивен",
      data: {
        code: "app.SITE_LOCKED",
        why: "Сайт неактивен или требует разблокировки",
        fix: "Активируйте сайт или передайте валидный site-unlock cookie",
      },
    }),
};
