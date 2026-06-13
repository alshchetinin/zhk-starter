import { describe, it, expect } from "vitest";
import {
  isUnexpectedError,
  extractNormalizedError,
  buildIssueEnrichment,
} from "../sentry";

describe("isUnexpectedError (Issues filter)", () => {
  it("treats missing status as unexpected (uncaught throw)", () => {
    expect(isUnexpectedError({})).toBe(true);
    expect(isUnexpectedError({ status: undefined })).toBe(true);
    expect(isUnexpectedError({ status: null })).toBe(true);
  });

  it("treats 5xx as unexpected", () => {
    expect(isUnexpectedError({ status: 500 })).toBe(true);
    expect(isUnexpectedError({ status: 503 })).toBe(true);
  });

  it("treats expected 4xx domain errors as NOT unexpected (Logs only)", () => {
    expect(isUnexpectedError({ status: 400 })).toBe(false); // validation
    expect(isUnexpectedError({ status: 401 })).toBe(false); // unauthorized
    expect(isUnexpectedError({ status: 403 })).toBe(false); // forbidden / site locked
    expect(isUnexpectedError({ status: 404 })).toBe(false); // not found
    expect(isUnexpectedError({ status: 429 })).toBe(false); // rate limited
  });
});

describe("extractNormalizedError", () => {
  it("reads a structured error object (server oRPC path: event.error)", () => {
    const normalized = extractNormalizedError({
      name: "EvlogError",
      message: "Boom",
      stack: "Error: Boom\n  at x",
      code: "app.INTERNAL",
      status: 500,
      why: "db down",
      fix: "retry",
    });
    expect(normalized).toEqual({
      name: "EvlogError",
      message: "Boom",
      stack: "Error: Boom\n  at x",
      code: "app.INTERNAL",
      status: 500,
      why: "db down",
      fix: "retry",
    });
  });

  it("parses a JSON-string error (client transport path)", () => {
    const normalized = extractNormalizedError(
      JSON.stringify({ name: "TypeError", message: "x is undefined", status: 500 }),
    );
    expect(normalized.name).toBe("TypeError");
    expect(normalized.message).toBe("x is undefined");
    expect(normalized.status).toBe(500);
  });

  it("falls back to code as name and defaults message", () => {
    const normalized = extractNormalizedError({ code: "app.NOT_FOUND", status: 404 });
    expect(normalized.name).toBe("app.NOT_FOUND");
    expect(normalized.message).toBe("Unknown error");
    expect(normalized.status).toBe(404);
  });

  it("coerces string status and statusCode", () => {
    expect(extractNormalizedError({ status: "500" }).status).toBe(500);
    expect(extractNormalizedError({ statusCode: 502 }).status).toBe(502);
  });

  it("is robust to garbage input (non-json string / null)", () => {
    expect(extractNormalizedError("not json").message).toBe("Unknown error");
    expect(extractNormalizedError(null).name).toBe("Error");
    expect(extractNormalizedError(undefined).status).toBeUndefined();
  });
});

describe("buildIssueEnrichment", () => {
  it("reconstructs an Error from normalized data when no original is available", () => {
    const normalized = extractNormalizedError({
      message: "DB connection failed",
      code: "app.INTERNAL",
      status: 500,
      stack: "Error: DB connection failed\n  at db.ts:1",
      why: "pool exhausted",
      fix: "increase pool size",
    });
    const { error, tags, extra } = buildIssueEnrichment(normalized, {
      operation: "projects.list",
      userId: "u-42",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("DB connection failed");
    expect(error.name).toBe("app.INTERNAL"); // code wins for grouping
    expect(error.stack).toBe("Error: DB connection failed\n  at db.ts:1");

    expect(tags).toEqual({ code: "app.INTERNAL", operation: "projects.list" });
    expect(extra).toEqual({
      why: "pool exhausted",
      fix: "increase pool size",
      userId: "u-42",
      status: 500,
    });
  });

  it("prefers the original Error object when provided", () => {
    const original = new TypeError("original boom");
    const normalized = extractNormalizedError({ message: "reconstructed", status: 500 });
    const { error } = buildIssueEnrichment(normalized, {}, original);
    expect(error).toBe(original);
    expect(error.message).toBe("original boom");
  });

  it("omits empty tags/extra fields", () => {
    const normalized = extractNormalizedError({ message: "bare", status: 500 });
    const { tags, extra } = buildIssueEnrichment(normalized, {});
    expect(tags).toEqual({}); // no code, no operation
    expect(extra).toEqual({ status: 500 }); // only status present
  });

  it("falls back to generic Error name when no code", () => {
    const normalized = extractNormalizedError({ message: "no code", status: 500 });
    const { error } = buildIssueEnrichment(normalized, {});
    expect(error.name).toBe("Error");
  });
});
