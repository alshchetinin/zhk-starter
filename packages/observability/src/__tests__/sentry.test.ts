import { describe, it, expect } from "vitest";
import { ORPCError } from "@orpc/server";
import { isUnexpectedError, extractErrorDetails } from "../sentry";

describe("isUnexpectedError (Issues filter)", () => {
  it("treats missing status as unexpected (uncaught throw)", () => {
    expect(isUnexpectedError()).toBe(true);
    expect(isUnexpectedError(undefined)).toBe(true);
    expect(isUnexpectedError(null)).toBe(true);
  });

  it("treats 5xx as unexpected", () => {
    expect(isUnexpectedError(500)).toBe(true);
    expect(isUnexpectedError(503)).toBe(true);
  });

  it("treats expected 4xx domain errors as NOT unexpected (skip Issues)", () => {
    expect(isUnexpectedError(400)).toBe(false); // validation
    expect(isUnexpectedError(401)).toBe(false); // unauthorized
    expect(isUnexpectedError(403)).toBe(false); // forbidden / site locked
    expect(isUnexpectedError(404)).toBe(false); // not found
    expect(isUnexpectedError(429)).toBe(false); // rate limited
  });
});

describe("extractErrorDetails", () => {
  it("reads code/why/fix from ORPCError.data and the message", () => {
    const err = new ORPCError("NOT_FOUND", {
      message: "Страница не найден",
      data: { code: "app.NOT_FOUND", why: "missing", fix: "check id" },
    });
    const details = extractErrorDetails(err);
    expect(details.code).toBe("app.NOT_FOUND");
    expect(details.why).toBe("missing");
    expect(details.fix).toBe("check id");
    expect(details.message).toBe("Страница не найден");
  });

  it("reads message from a plain Error without data", () => {
    const details = extractErrorDetails(new Error("boom"));
    expect(details.message).toBe("boom");
    expect(details.code).toBeUndefined();
    expect(details.why).toBeUndefined();
    expect(details.fix).toBeUndefined();
  });

  it("is robust to garbage input (null / non-object)", () => {
    expect(extractErrorDetails(null)).toEqual({});
    expect(extractErrorDetails("not an error")).toEqual({});
    expect(extractErrorDetails(undefined)).toEqual({});
  });

  it("ignores non-object data", () => {
    const err = new ORPCError("BAD_REQUEST", {
      message: "bad",
      data: "not an object",
    });
    const details = extractErrorDetails(err);
    expect(details.code).toBeUndefined();
    expect(details.message).toBe("bad");
  });
});
