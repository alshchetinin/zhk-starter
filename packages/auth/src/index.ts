import { db } from "@zhk/db";
import * as schema from "@zhk/db/schema";
import { env } from "@zhk/env/server";
import { getRedis } from "@zhk/ratelimit";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

// Ленивый secondaryStorage: getRedis() вызывается внутри методов, а не на
// уровне модуля — ioredis-клиент создаётся при первом auth-запросе, а не при
// импорте (важно для тестов, импортирующих @zhk/auth без живого Redis).
const secondaryStorage = {
  get: async (key: string) => (await getRedis().get(key)) ?? null,
  set: async (key: string, value: string, ttl?: number) => {
    const redis = getRedis();
    if (ttl) await redis.set(key, value, "EX", ttl);
    else await redis.set(key, value);
  },
  delete: async (key: string) => {
    await getRedis().del(key);
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
