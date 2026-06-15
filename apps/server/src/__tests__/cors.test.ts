import { describe, expect, it } from "vitest";
import { resolveCorsOrigin } from "../cors";

const ALLOWLIST = ["https://example.com", "https://admin.example.com"];

describe("resolveCorsOrigin", () => {
  it("отражает любой Origin для контент-API /rpc/* (мультитенант: поддомены и кастомные домены)", () => {
    expect(
      resolveCorsOrigin("https://kazan.example.com", "/rpc/public/site/status", ALLOWLIST),
    ).toBe("https://kazan.example.com");
    // публичная ручка вне /rpc/public/* тоже должна читаться с любого домена
    expect(
      resolveCorsOrigin("https://my-custom-domain.ru", "/rpc/media/altMap", ALLOWLIST),
    ).toBe("https://my-custom-domain.ru");
  });

  it("пропускает allowlisted origin на не-/rpc путях (админка/основной сайт)", () => {
    expect(
      resolveCorsOrigin("https://admin.example.com", "/api/auth/get-session", ALLOWLIST),
    ).toBe("https://admin.example.com");
  });

  it("режет неразрешённый origin на /api/auth/* (где минтятся креды)", () => {
    expect(
      resolveCorsOrigin("https://evil.com", "/api/auth/sign-in/email", ALLOWLIST),
    ).toBeNull();
  });

  it("режет произвольный origin на прочих не-/rpc путях", () => {
    expect(resolveCorsOrigin("https://evil.com", "/", ALLOWLIST)).toBeNull();
  });

  it("без Origin (server-to-server) → null, ACAO не ставится", () => {
    expect(resolveCorsOrigin("", "/rpc/public/site/status", ALLOWLIST)).toBeNull();
    expect(resolveCorsOrigin("", "/api/auth/get-session", ALLOWLIST)).toBeNull();
  });
});
