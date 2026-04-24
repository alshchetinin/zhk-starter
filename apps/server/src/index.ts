import { createContext } from "@zhk/api/context";
import { appRouter } from "@zhk/api/routers/index";
import { auth } from "@zhk/auth";
import { env } from "@zhk/env/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { startScheduler } from "./scheduler";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-site-id", "x-site-slug", "x-forwarded-host"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const rpcHandler = new RPCHandler(appRouter);

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

const port = 3000;
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
startScheduler();

export default app;
