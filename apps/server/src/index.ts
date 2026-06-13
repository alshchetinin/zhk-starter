import { createContext } from "@zhk/api/context";
import { appRouter } from "@zhk/api/routers/index";
import { auth } from "@zhk/auth";
import { env } from "@zhk/env/server";
import {
  initObservability,
  parseError,
  isUnexpectedError,
  extractNormalizedError,
  buildIssueEnrichment,
} from "@zhk/observability";
import * as Sentry from "@sentry/node";
import { RPCHandler } from "@orpc/server/fetch";
import { withEvlog, type EvlogOrpcContext } from "evlog/orpc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { startScheduler } from "./scheduler";
import { rateLimitCeiling } from "./middleware/rate-limit";

initObservability("zhk-server");

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-site-id", "x-site-slug", "x-forwarded-host"],
    credentials: true,
  }),
);

app.use("/*", rateLimitCeiling);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// withEvlog оборачивает .handle так, что каждый matched RPC-запрос
// эмитит один wide event (route/timing), context.log прокидывается в процедуры.
const rpcHandler = withEvlog(new RPCHandler(appRouter));

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    // withEvlog инжектит context.log сам (см. evlog/orpc), поэтому базовый
    // context здесь его не содержит — оборачиваем тип под сигнатуру handle.
    context: context as typeof context & EvlogOrpcContext,
  });

  if (rpcResult.matched) {
    const merged = new Headers(rpcResult.response.headers);
    context.responseHeaders.forEach((value, key) => merged.append(key, value));
    return c.newResponse(rpcResult.response.body, {
      status: rpcResult.response.status,
      headers: merged,
    });
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

app.onError((error, c) => {
  const parsed = parseError(error);

  // Hono-level необработанные ошибки не проходят через evlog drain — захватываем
  // неожиданные (5xx / без статуса) в Sentry Issues прямо здесь. Ожидаемые 4xx
  // пропускаем (они и так уезжают в Logs через oRPC-путь).
  if (isUnexpectedError({ status: parsed.status })) {
    const normalized = extractNormalizedError({
      name: parsed.code,
      message: parsed.message,
      code: parsed.code,
      status: parsed.status,
      why: parsed.why,
      fix: parsed.fix,
      stack: error instanceof Error ? error.stack : undefined,
    });
    const { error: errObj, tags, extra } = buildIssueEnrichment(normalized, {}, error);
    Sentry.captureException(errObj, { tags, extra });
  }

  const status = (parsed.status ?? 500) as 500;
  return c.json({ message: parsed.message, code: parsed.code }, status);
});

const port = 3000;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
startScheduler();

export default app;
