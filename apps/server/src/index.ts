import { createContext } from "@zhk/api/context";
import { appRouter } from "@zhk/api/routers/index";
import { auth } from "@zhk/auth";
import { env } from "@zhk/env/server";
import { initObservability, captureUnexpected } from "@zhk/observability";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { startScheduler } from "./scheduler";
import { rateLimitCeiling } from "./middleware/rate-limit";
import { resolveCorsOrigin } from "./cors";

// Инициализируем Sentry до создания приложения (idempotent, no-op без DSN).
initObservability("zhk-server");

const app = new Hono();

app.use(logger());

app.use(
  "/*",
  cors({
    // Контент-API (/rpc/*) читается с любых доменов/поддоменов сайтов
    // (мультитенант), /api/auth/* и прочее — только из allowlist CORS_ORIGINS.
    // Детали и обоснование безопасности — в ./cors.
    origin: (origin, c) => resolveCorsOrigin(origin, c.req.path, env.CORS_ORIGINS),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-site-id", "x-site-slug", "x-forwarded-host", "x-site-unlock"],
    credentials: true,
  }),
);

app.use("/*", rateLimitCeiling);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const rpcHandler = new RPCHandler(appRouter);

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    const merged = new Headers(rpcResult.response.headers);
    context.responseHeaders.forEach((value, key) => merged.append(key, value));
    return new Response(rpcResult.response.body, {
      status: rpcResult.response.status,
      headers: merged,
    });
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

// Hono-level / необработанные ошибки (oRPC-процедуры обрабатывает RPCHandler и
// возвращает ответом — они сюда не доходят, их ловит sentryCapture middleware).
// captureUnexpected сам фильтрует: шлёт только 5xx / не-ORPCError.
app.onError((error, c) => {
  captureUnexpected(error, {});
  const status = error instanceof ORPCError ? error.status : 500;
  const message = error instanceof ORPCError ? error.message : "Internal Server Error";
  return c.json({ message }, status as 500);
});

const port = 3000;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
startScheduler();

export default app;
