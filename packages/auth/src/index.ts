import { db } from "@zhk/db";
import * as schema from "@zhk/db/schema";
import { env } from "@zhk/env/server";
import { getRedis } from "@zhk/ratelimit";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

// Ленивый + fail-soft secondaryStorage. getRedis() вызывается внутри методов
// (ioredis-клиент создаётся при первом auth-запросе, не при импорте — важно для
// тестов и для дева без Redis). Ошибки Redis ГЛОТАЮТСЯ: secondaryStorage —
// вторичный кэш (сессии всё равно лежат в БД через drizzleAdapter), а
// better-auth rate-limiter дёргает get/set на КАЖДОМ auth-запросе и НЕ ловит
// исключения — без try/catch недоступный Redis валит весь auth в 500
// (нельзя залогиниться, нельзя проверить сессию). get→null, set/delete→noop
// дают graceful degradation: auth работает без Redis, в проде Redis есть.
const secondaryStorage = {
  get: async (key: string) => {
    try {
      return (await getRedis().get(key)) ?? null;
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string, ttl?: number) => {
    try {
      const redis = getRedis();
      if (ttl) await redis.set(key, value, "EX", ttl);
      else await redis.set(key, value);
    } catch {
      // Redis недоступен — пропускаем запись (fail-open для auth-кэша).
    }
  },
  delete: async (key: string) => {
    try {
      await getRedis().del(key);
    } catch {
      // Redis недоступен — пропускаем удаление.
    }
  },
};

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
  secondaryStorage,
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
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
