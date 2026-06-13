import * as Sentry from "@sentry/node";
import { createSentryDrain } from "evlog/sentry";
import type { DrainContext } from "evlog";

// ---------------------------------------------------------------------------
// Путь B: неожиданные ошибки → GlitchTip Issues (через @sentry/node).
//
// Параллельно работающему evlog→Logs дренажу (createSentryDrain шлёт Sentry
// `log`-конверты → раздел Logs) этот модуль отправляет `event`-конверты через
// Sentry.captureException → раздел Issues (группировка, алёрты).
//
// DSN живёт ТОЛЬКО на сервере (Hono / Nitro), в браузер не утекает: @sentry/nuxt
// и браузерный SDK сознательно не подключены.
// ---------------------------------------------------------------------------

/** Нормализованные данные ошибки, извлечённые из wide-event / Error. */
export interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  status?: number;
  why?: string;
  fix?: string;
}

/** То, что в итоге уходит в Sentry.captureException(error, { tags, extra }). */
export interface IssueEnrichment {
  error: Error;
  tags: Record<string, string>;
  extra: Record<string, unknown>;
}

// --- Sentry init (идемпотентно, только при наличии DSN) --------------------

/**
 * Инициализирует @sentry/node для отправки Issues. No-op без DSN и при
 * повторном вызове (если клиент уже сконфигурирован).
 *
 * tracesSampleRate: 0 + defaultIntegrations: false — нам нужны только error
 * issues, без трейсинга/перформанса и тяжёлых авто-интеграций. captureException
 * работает и с пустым набором интеграций (группировка делается на стороне
 * GlitchTip по exception type+value).
 */
export function initSentry(dsn?: string): boolean {
  if (!dsn) return false;
  if (Sentry.getClient()) return true;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    defaultIntegrations: false,
  });
  return true;
}

// --- Фильтр «неожиданности» (чистая функция) -------------------------------

/**
 * Неожиданная ошибка = 5xx ИЛИ отсутствие статуса (необработанный throw).
 * Ожидаемые доменные 4xx (404/401/403/429/400 и любые другие < 500) → false:
 * они остаются только в Logs и НЕ создают Issues.
 */
export function isUnexpectedError(input: { status?: number | null }): boolean {
  const status = input.status;
  if (status === undefined || status === null) return true;
  return status >= 500;
}

// --- Извлечение данных ошибки из произвольного источника -------------------

function coerceErrorRecord(value: unknown): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return undefined;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asStatus(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Достаёт нормализованные поля ошибки из «error»-объекта wide-event.
 *
 * evlog `log.error(err)` кладёт структурированный объект в `event.error`:
 * `{ name, message, stack, code?, status?, why?, fix?, ... }` (см. logger.error
 * в evlog). Клиентские ошибки, прилетающие транспортом, могут лежать как JSON
 * строка (в т.ч. под `data.error`). Поэтому принимаем object | JSON-string.
 */
export function extractNormalizedError(source: unknown): NormalizedError {
  const rec = coerceErrorRecord(source) ?? {};
  const code = asString(rec.code);
  const status = asStatus(rec.status) ?? asStatus(rec.statusCode);
  return {
    name: asString(rec.name) ?? code ?? "Error",
    message: asString(rec.message) ?? asString(rec.statusMessage) ?? "Unknown error",
    stack: asString(rec.stack),
    code,
    status,
    why: asString(rec.why),
    fix: asString(rec.fix),
  };
}

/**
 * Находит «error»-полезную нагрузку внутри wide-event. Робастно к нескольким
 * раскладкам: верхнеуровневый `event.error` (серверный oRPC-путь — объект),
 * `event.data.error` (клиентский транспорт — часто JSON-строка), либо строка.
 */
function findErrorPayload(event: Record<string, unknown>): unknown {
  if (event.error !== undefined && event.error !== null) return event.error;
  const data = event.data;
  if (data && typeof data === "object") {
    const inner = (data as Record<string, unknown>).error;
    if (inner !== undefined && inner !== null) return inner;
  }
  return undefined;
}

// --- Построение enrichment для captureException ----------------------------

/**
 * Реконструирует Error из нормализованных данных (когда оригинального Error
 * под рукой нет — например, ошибка пришла транспортом как JSON) и собирает
 * tags/extra для Issue. Чистая функция — тестируема без Sentry.
 *
 * @param normalized данные ошибки (из extractNormalizedError)
 * @param attrs      атрибуты события: operation, userId
 * @param original   оригинальный Error, если доступен (серверный путь)
 */
export function buildIssueEnrichment(
  normalized: NormalizedError,
  attrs: { operation?: string; userId?: string } = {},
  original?: unknown,
): IssueEnrichment {
  const error =
    original instanceof Error
      ? original
      : (() => {
          const e = new Error(normalized.message);
          e.name = normalized.code ?? normalized.name ?? "Error";
          if (normalized.stack) e.stack = normalized.stack;
          return e;
        })();

  const tags: Record<string, string> = {};
  if (normalized.code) tags.code = normalized.code;
  if (attrs.operation) tags.operation = attrs.operation;

  const extra: Record<string, unknown> = {};
  if (normalized.why) extra.why = normalized.why;
  if (normalized.fix) extra.fix = normalized.fix;
  if (attrs.userId) extra.userId = attrs.userId;
  if (normalized.status !== undefined) extra.status = normalized.status;

  return { error, tags, extra };
}

// --- Drain: захват неожиданной ошибки из wide-event как Issue --------------

function eventAttr(event: Record<string, unknown>, key: string): string | undefined {
  return asString(event[key]);
}

function eventUserId(event: Record<string, unknown>): string | undefined {
  const direct = asString(event.userId);
  if (direct) return direct;
  const user = event.user;
  if (user && typeof user === "object") {
    return asString((user as Record<string, unknown>).id);
  }
  return undefined;
}

/**
 * Для одного DrainContext: если это ошибочное событие с неожиданной ошибкой —
 * шлёт его в Sentry Issues. Ожидаемые 4xx и не-ошибочные события пропускает.
 * Безопасно к отсутствию данных (никогда не бросает).
 */
export function captureUnexpectedIssue(ctx: DrainContext): void {
  if (!Sentry.getClient()) return;

  const event = ctx.event as Record<string, unknown>;
  if (event.level !== "error") return;

  const payload = findErrorPayload(event);
  if (payload === undefined) return;

  const normalized = extractNormalizedError(payload);
  if (!isUnexpectedError({ status: normalized.status })) return;

  const original = payload instanceof Error ? payload : undefined;
  const { error, tags, extra } = buildIssueEnrichment(
    normalized,
    {
      operation: eventAttr(event, "operation"),
      userId: eventUserId(event),
    },
    original,
  );

  Sentry.captureException(error, { tags, extra });
}

/**
 * Композитный drain: сохраняет работающий evlog→Logs дренаж (createSentryDrain)
 * И добавляет захват неожиданных ошибок в Sentry Issues. Подходит как для
 * `initLogger({ drain })`, так и для Nitro-хука `evlog:drain`.
 */
export function createObservabilityDrain(
  dsn: string,
): (ctx: DrainContext | DrainContext[]) => Promise<void> {
  const logsDrain = createSentryDrain({ dsn });
  return async (ctx: DrainContext | DrainContext[]) => {
    // Issues-захват синхронный и локальный (никаких сетевых вызовов из drain —
    // @sentry/node сам батчит/шлёт), не блокируем и не валим logs-дренаж.
    const contexts = Array.isArray(ctx) ? ctx : [ctx];
    for (const c of contexts) {
      try {
        captureUnexpectedIssue(c);
      } catch {
        // Issue-захват не должен ломать основной logs-дренаж.
      }
    }
    await logsDrain(ctx);
  };
}
