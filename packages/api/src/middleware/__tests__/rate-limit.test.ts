import { describe, expect, it } from "vitest";
import { buildRateLimitKey } from "../rate-limit";

describe("buildRateLimitKey", () => {
  const ctx = { clientIp: "1.2.3.4", siteId: "site-9" };

  it("keyBy ip", () => {
    expect(buildRateLimitKey("ip", ctx, undefined)).toBe("1.2.3.4");
  });
  it("keyBy ip+site", () => {
    expect(buildRateLimitKey("ip+site", ctx, undefined)).toBe("1.2.3.4|site-9");
  });
  it("keyBy ip+site без siteId использует none", () => {
    expect(buildRateLimitKey("ip+site", { clientIp: "1.2.3.4", siteId: null }, undefined)).toBe("1.2.3.4|none");
  });
  it("keyBy ip+extra добавляет нормализованное значение", () => {
    expect(buildRateLimitKey("ip+extra", ctx, "+7 (999) 123-45-67")).toBe("1.2.3.4|79991234567");
  });
  it("keyBy ip+extra без значения → ip|none", () => {
    expect(buildRateLimitKey("ip+extra", ctx, undefined)).toBe("1.2.3.4|none");
  });
});
