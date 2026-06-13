import { describe, it, expect } from "vitest";
import { parseError } from "evlog";
import { appErrors } from "../errors";

describe("appErrors catalog", () => {
  it("derives wire code app.NOT_FOUND and renders dynamic message", () => {
    const err = appErrors.NOT_FOUND({ entity: "Страница" });
    const parsed = parseError(err);
    expect(parsed.code).toBe("app.NOT_FOUND");
    expect(parsed.status).toBe(404);
    expect(parsed.message).toContain("Страница");
  });

  it("static error carries code/status", () => {
    const parsed = parseError(appErrors.RATE_LIMITED());
    expect(parsed.code).toBe("app.RATE_LIMITED");
    expect(parsed.status).toBe(429);
  });
});
