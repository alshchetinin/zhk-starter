import { db } from "@zhk/db";
import * as schema from "@zhk/db/schema";
import { env } from "@zhk/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: env.CORS_ORIGINS,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    },
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  // Сессии хранятся в БД (drizzleAdapter). НЕ подключаем secondaryStorage:
  // при его наличии better-auth хранит сессии в нём (Redis), и без Redis
  // сессия теряется (get→null) — вход «проходит», но сразу разлогинивает.
  // Auth rate-limit держим в памяти (storage: "memory") — per-instance, без
  // зависимости от Redis. Для шаринга лимита между инстансами в проде можно
  // перейти на storage: "database" (нужна таблица rateLimit + миграция).
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 900,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
    },
  },
  plugins: [
    admin({
      defaultRole: "admin",
    }),
  ],
});
