import { describe, expect, it } from "vitest";
import {
  SITE_UNLOCK_COOKIE_PREFIX,
  SITE_UNLOCK_HEADER,
  extractUnlockToken,
} from "../site-gate";
import {
  computeUnlockToken,
  isSiteUnlockValid,
  isUnlockTokenValid,
  unlockCookieName,
} from "../../utils/site-unlock";

const SITE_ID = "11111111-1111-1111-1111-111111111111";
const PASSWORD = "secret";

describe("constants", () => {
  it("префикс куки и имя заголовка зафиксированы", () => {
    expect(SITE_UNLOCK_COOKIE_PREFIX).toBe("zhk_site_unlock_");
    expect(SITE_UNLOCK_HEADER).toBe("x-site-unlock");
    expect(unlockCookieName(SITE_ID)).toBe(`zhk_site_unlock_${SITE_ID}`);
  });
});

describe("extractUnlockToken", () => {
  const token = computeUnlockToken(SITE_ID, PASSWORD);

  it("достаёт токен анлока среди прочих кук", () => {
    const header = `foo=bar; ${unlockCookieName(SITE_ID)}=${token}; baz=qux`;
    expect(extractUnlockToken(header)).toBe(token);
  });

  it("декодирует url-encoded значение", () => {
    const header = `${unlockCookieName(SITE_ID)}=${encodeURIComponent("a b+c")}`;
    expect(extractUnlockToken(header)).toBe("a b+c");
  });

  it("null, если куки анлока нет", () => {
    expect(extractUnlockToken("foo=bar; baz=qux")).toBeNull();
    expect(extractUnlockToken("")).toBeNull();
    expect(extractUnlockToken(null)).toBeNull();
    expect(extractUnlockToken(undefined)).toBeNull();
  });
});

describe("isUnlockTokenValid", () => {
  const token = computeUnlockToken(SITE_ID, PASSWORD);

  it("верный токен → true", () => {
    expect(isUnlockTokenValid(token, SITE_ID, PASSWORD)).toBe(true);
  });

  it("неверный токен → false", () => {
    expect(isUnlockTokenValid("deadbeef", SITE_ID, PASSWORD)).toBe(false);
    expect(isUnlockTokenValid(null, SITE_ID, PASSWORD)).toBe(false);
    expect(isUnlockTokenValid(undefined, SITE_ID, PASSWORD)).toBe(false);
  });

  it("сайт без пароля → всегда true (гейта нет)", () => {
    expect(isUnlockTokenValid(null, SITE_ID, null)).toBe(true);
  });

  it("согласован с проверкой по куке (заголовок ≡ кука)", () => {
    const cookieHeader = `${unlockCookieName(SITE_ID)}=${token}`;
    const headerToken = extractUnlockToken(cookieHeader);
    expect(isUnlockTokenValid(headerToken, SITE_ID, PASSWORD)).toBe(
      isSiteUnlockValid(cookieHeader, SITE_ID, PASSWORD),
    );
  });
});
