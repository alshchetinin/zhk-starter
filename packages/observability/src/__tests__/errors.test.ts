import { describe, it, expect } from "vitest";
import { ORPCError } from "@orpc/server";
import { appErrors } from "../errors";

describe("appErrors catalog", () => {
  it("NOT_FOUND: renders dynamic message, maps to 404, carries data", () => {
    const err = appErrors.NOT_FOUND({ entity: "Страница" });
    expect(err).toBeInstanceOf(ORPCError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.message).toContain("Страница");
    expect(err.data).toMatchObject({
      code: "app.NOT_FOUND",
      why: expect.any(String),
      fix: expect.any(String),
    });
  });

  it("RATE_LIMITED: maps to 429 with app.RATE_LIMITED code", () => {
    const err = appErrors.RATE_LIMITED();
    expect(err.code).toBe("TOO_MANY_REQUESTS");
    expect(err.status).toBe(429);
    expect(err.data.code).toBe("app.RATE_LIMITED");
  });

  it("SITE_LOCKED: maps to 403 with app.SITE_LOCKED code", () => {
    const err = appErrors.SITE_LOCKED();
    expect(err.code).toBe("FORBIDDEN");
    expect(err.status).toBe(403);
    expect(err.data.code).toBe("app.SITE_LOCKED");
  });
});
