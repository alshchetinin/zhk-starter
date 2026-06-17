import { describe, expect, it } from "vitest";
import { isSiteArchived, canArchiveSite, canRestoreSite } from "../site-archive";

describe("isSiteArchived", () => {
  it("archivedAt задан → в архиве", () => {
    expect(isSiteArchived({ archivedAt: new Date() })).toBe(true);
    expect(isSiteArchived({ archivedAt: "2026-06-17T00:00:00Z" })).toBe(true);
  });
  it("archivedAt null → не в архиве", () => {
    expect(isSiteArchived({ archivedAt: null })).toBe(false);
  });
});

describe("canArchiveSite", () => {
  it("обычный активный сайт можно архивировать", () => {
    expect(canArchiveSite({ isPrimary: false, archivedAt: null })).toBe(true);
  });
  it("главный сайт архивировать нельзя", () => {
    expect(canArchiveSite({ isPrimary: true, archivedAt: null })).toBe(false);
  });
  it("уже архивный сайт повторно архивировать нельзя", () => {
    expect(canArchiveSite({ isPrimary: false, archivedAt: new Date() })).toBe(false);
  });
  it("главный и уже архивный — тоже нельзя", () => {
    expect(canArchiveSite({ isPrimary: true, archivedAt: new Date() })).toBe(false);
  });
});

describe("canRestoreSite", () => {
  it("архивный сайт можно восстановить", () => {
    expect(canRestoreSite({ archivedAt: new Date() })).toBe(true);
  });
  it("не-архивный сайт восстанавливать нечего", () => {
    expect(canRestoreSite({ archivedAt: null })).toBe(false);
  });
});
