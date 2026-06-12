import { describe, expect, it } from "vitest";
import { RATE_LIMIT_DEFAULTS, resolveRateLimitConfig } from "../config";
import type { RateLimitScope } from "../config";

describe("RATE_LIMIT_DEFAULTS", () => {
  it("содержит все scopes с failMode", () => {
    const scopes: RateLimitScope[] = [
      "authSignIn", "siteUnlock", "ticketCreate", "ticketCreateHourly",
      "contactsGetByIds", "publicRead", "honoCeiling",
    ];
    for (const s of scopes) {
      expect(RATE_LIMIT_DEFAULTS[s]).toBeDefined();
      expect(RATE_LIMIT_DEFAULTS[s].points).toBeGreaterThan(0);
      expect(RATE_LIMIT_DEFAULTS[s].duration).toBeGreaterThan(0);
      expect(["open", "closed"]).toContain(RATE_LIMIT_DEFAULTS[s].failMode);
    }
  });

  it("критичные scopes — failMode closed", () => {
    expect(RATE_LIMIT_DEFAULTS.authSignIn.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.siteUnlock.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.ticketCreate.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.publicRead.failMode).toBe("open");
  });
});

describe("resolveRateLimitConfig", () => {
  it("без env-оверрайдов отдаёт дефолты", () => {
    const cfg = resolveRateLimitConfig("ticketCreate", {});
    expect(cfg.points).toBe(RATE_LIMIT_DEFAULTS.ticketCreate.points);
    expect(cfg.duration).toBe(RATE_LIMIT_DEFAULTS.ticketCreate.duration);
  });

  it("env-оверрайд points/duration применяется", () => {
    const cfg = resolveRateLimitConfig("ticketCreate", {
      RL_TICKET_CREATE_POINTS: 99,
      RL_TICKET_CREATE_DURATION: 111,
    });
    expect(cfg.points).toBe(99);
    expect(cfg.duration).toBe(111);
    expect(cfg.failMode).toBe("closed");
  });
});
