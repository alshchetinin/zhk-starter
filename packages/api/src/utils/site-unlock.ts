import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "zhk_site_unlock_";
const COOKIE_MAX_AGE_DAYS = 30;

function getSecret(): string {
  return process.env.SITE_UNLOCK_SECRET ?? "dev-site-unlock-secret-change-me";
}

export function computeUnlockToken(siteId: string, password: string): string {
  return createHmac("sha256", getSecret())
    .update(`${siteId}:${password}`)
    .digest("hex");
}

export function unlockCookieName(siteId: string): string {
  return `${COOKIE_PREFIX}${siteId}`;
}

export function readCookie(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (!rawKey) continue;
    if (rawKey.trim() === name) return decodeURIComponent(rest.join("=").trim());
  }
  return null;
}

export function cookiesMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function buildUnlockSetCookie(siteId: string, token: string): string {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${unlockCookieName(siteId)}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function buildUnlockClearCookie(siteId: string): string {
  return `${unlockCookieName(siteId)}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function isSiteUnlockValid(
  cookieHeader: string,
  siteId: string,
  password: string | null,
): boolean {
  if (!password) return true;
  const value = readCookie(cookieHeader, unlockCookieName(siteId));
  if (!value) return false;
  return cookiesMatch(value, computeUnlockToken(siteId, password));
}
