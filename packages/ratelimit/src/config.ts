export type FailMode = "open" | "closed";

export interface ScopeConfig {
  points: number;
  duration: number; // секунды
  blockDuration?: number; // секунды
  failMode: FailMode;
}

export type RateLimitScope =
  | "authSignIn"
  | "siteUnlock"
  | "ticketCreate"
  | "ticketCreateHourly"
  | "contactsGetByIds"
  | "publicRead"
  | "honoCeiling";

export const RATE_LIMIT_DEFAULTS: Record<RateLimitScope, ScopeConfig> = {
  authSignIn: { points: 5, duration: 900, blockDuration: 900, failMode: "closed" },
  siteUnlock: { points: 5, duration: 600, blockDuration: 600, failMode: "closed" },
  ticketCreate: { points: 5, duration: 600, blockDuration: 600, failMode: "closed" },
  ticketCreateHourly: { points: 20, duration: 3600, failMode: "closed" },
  contactsGetByIds: { points: 30, duration: 60, failMode: "open" },
  publicRead: { points: 120, duration: 60, failMode: "open" },
  honoCeiling: { points: 300, duration: 60, failMode: "open" },
};

/** Маппинг scope → имена env-оверрайдов (points/duration). */
const ENV_KEYS: Partial<Record<RateLimitScope, { points?: string; duration?: string }>> = {
  authSignIn: { points: "RL_AUTH_SIGNIN_POINTS", duration: "RL_AUTH_SIGNIN_DURATION" },
  siteUnlock: { points: "RL_SITE_UNLOCK_POINTS", duration: "RL_SITE_UNLOCK_DURATION" },
  ticketCreate: { points: "RL_TICKET_CREATE_POINTS", duration: "RL_TICKET_CREATE_DURATION" },
  ticketCreateHourly: { points: "RL_TICKET_HOURLY_POINTS" },
  contactsGetByIds: { points: "RL_CONTACTS_GETBYIDS_POINTS" },
  publicRead: { points: "RL_PUBLIC_READ_POINTS" },
  honoCeiling: { points: "RL_HONO_CEILING_POINTS" },
};

/**
 * Итоговый конфиг scope с учётом env-оверрайдов. envBag — объект env
 * (в проде передаётся `env` из @zhk/env/server; в тестах — литерал).
 */
export function resolveRateLimitConfig(
  scope: RateLimitScope,
  envBag: Record<string, unknown>,
): ScopeConfig {
  const base = RATE_LIMIT_DEFAULTS[scope];
  const keys = ENV_KEYS[scope] ?? {};
  const points =
    keys.points && typeof envBag[keys.points] === "number"
      ? (envBag[keys.points] as number)
      : base.points;
  const duration =
    keys.duration && typeof envBag[keys.duration] === "number"
      ? (envBag[keys.duration] as number)
      : base.duration;
  return { ...base, points, duration };
}
