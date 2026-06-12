import { describe, expect, it } from "vitest";
import { getClientIp } from "../client-ip";

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("getClientIp", () => {
  it("берёт первый IP из x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("триммит пробелы", () => {
    expect(getClientIp(h({ "x-forwarded-for": "  203.0.113.7 " }))).toBe("203.0.113.7");
  });
  it("фоллбэк на x-real-ip", () => {
    expect(getClientIp(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });
  it("x-forwarded-for имеет приоритет над x-real-ip", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.4" }))).toBe("203.0.113.7");
  });
  it("возвращает unknown без заголовков", () => {
    expect(getClientIp(h({}))).toBe("unknown");
  });
  it("игнорирует пустой/мусорный x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(getClientIp(h({ "x-forwarded-for": "not an ip", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });
  it("принимает IPv6", () => {
    expect(getClientIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
  it("стрипает порт у IPv4", () => {
    expect(getClientIp(h({ "x-forwarded-for": "1.2.3.4:5678" }))).toBe("1.2.3.4");
  });
  it("разворачивает IPv4-mapped IPv6", () => {
    expect(getClientIp(h({ "x-forwarded-for": "::ffff:203.0.113.7" }))).toBe("203.0.113.7");
  });
  it("разворачивает IPv4-mapped IPv6 со стрипом порта", () => {
    expect(getClientIp(h({ "x-forwarded-for": "::ffff:203.0.113.7:9999" }))).toBe("203.0.113.7");
  });
});
