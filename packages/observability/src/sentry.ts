import * as Sentry from "@sentry/node";
import { ORPCError } from "@orpc/server";

// ---------------------------------------------------------------------------
// Неожиданные ошибки → GlitchTip Issues (через @sentry/node).
//
// Только @sentry/node (один физический инстанс) — evlog выпилен из-за
// multi-copy fragility (pnpm ставит несколько физических копий по peer-deps,
// и module-global конфиг логгера, заданный в одной копии, не применяется к
// событиям из другой → в реальном приложении ничего не доходило до бэкенда).
//
// DSN живёт ТОЛЬКО на сервере (Hono / Nitro), в браузер не утекает: браузерный
// SDK сознательно не подключён (web — только серверный/SSR путь).
// ---------------------------------------------------------------------------

// --- Sentry init (идемпотентно, только при наличии DSN) --------------------

/**
 * Инициализирует @sentry/node для отправки Issues. No-op без DSN и при
 * повторном вызове (если клиент уже сконфигурирован).
 *
 * Нам нужны только error-issues (без трейсинга/перформанса), поэтому
 * tracesSampleRate НЕ задаём — трейсинг остаётся выключенным. ВАЖНО:
 * defaultIntegrations оставляем включёнными — с `defaultIntegrations: false`
 * @sentry/node перестаёт отправлять события (проверено против GlitchTip:
 * событие создаётся, но не уходит). Дефолтные интеграции лёгкие и нужны
 * для самого пайплайна доставки + ловят uncaught/unhandledRejection.
 */
export function initSentry(dsn?: string): boolean {
  if (!dsn) return false;
  if (Sentry.getClient()) return true;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
  });
  return true;
}

// --- Фильтр «неожиданности» (чистая функция) -------------------------------

/**
 * Неожиданная ошибка = 5xx ИЛИ отсутствие статуса (необработанный throw).
 * Ожидаемые доменные 4xx (404/401/403/429/400 и любые другие < 500) → false:
 * это нормальный control-flow, а не баг, в Issues их не шлём.
 */
export function isUnexpectedError(status?: number | null): boolean {
  if (status === undefined || status === null) return true;
  return status >= 500;
}

// --- Извлечение данных ошибки (why/fix/code/message) ------------------------

/** Поля, которые `appErrors` кладёт в ORPCError.data для AI-читаемости. */
interface ErrorDetails {
  code?: string;
  why?: string;
  fix?: string;
  message?: string;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Достаёт `{ code, why, fix }` из `err.data` (так их кладут `appErrors`) плюс
 * `err.message`. Робастно к ошибкам без data / не-объектам.
 */
export function extractErrorDetails(err: unknown): ErrorDetails {
  const details: ErrorDetails = {};
  if (err && typeof err === "object") {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      details.code = asString(rec.code);
      details.why = asString(rec.why);
      details.fix = asString(rec.fix);
    }
    details.message = asString((err as { message?: unknown }).message);
  }
  return details;
}

// --- Захват неожиданной ошибки как Issue -----------------------------------

export interface CaptureContext {
  operation?: string;
  siteId?: string;
  userId?: string;
}

/**
 * Шлёт ошибку в Sentry Issues, если она НЕОЖИДАННАЯ (ORPCError со статусом
 * >= 500 ИЛИ любой не-ORPCError throw). Ожидаемые 4xx ORPCError пропускает.
 * No-op без сконфигурированного клиента. Передаёт ОРИГИНАЛЬНЫЙ err — у Sentry
 * остаётся настоящий стек. Никогда не бросает.
 */
export function captureUnexpected(err: unknown, ctx: CaptureContext): void {
  if (!Sentry.getClient()) return;

  const status = err instanceof ORPCError ? err.status : undefined;
  if (!isUnexpectedError(status)) return;

  const { code, why, fix } = extractErrorDetails(err);

  const tags: Record<string, string> = {};
  if (code) tags.code = code;
  if (ctx.operation) tags.operation = ctx.operation;
  if (ctx.siteId) tags.siteId = ctx.siteId;

  const extra: Record<string, unknown> = {};
  if (why) extra.why = why;
  if (fix) extra.fix = fix;
  if (ctx.userId) extra.userId = ctx.userId;
  if (status !== undefined) extra.status = status;

  Sentry.captureException(err, { tags, extra });
}
