import { describe, expect, it } from "vitest";
import { isSiteIndexable } from "../seo";

describe("isSiteIndexable", () => {
  it("открытый активный сайт индексируется", () => {
    expect(
      isSiteIndexable({ isActive: true, accessPassword: null, indexingEnabled: true }),
    ).toBe(true);
  });

  it("indexingEnabled не задан (undefined) — индексация включена по умолчанию", () => {
    expect(isSiteIndexable({ isActive: true, accessPassword: null })).toBe(true);
  });

  it("сайт под паролем не индексируется", () => {
    expect(
      isSiteIndexable({ isActive: true, accessPassword: "secret", indexingEnabled: true }),
    ).toBe(false);
  });

  it("неактивный сайт не индексируется", () => {
    expect(isSiteIndexable({ isActive: false, accessPassword: null })).toBe(false);
  });

  it("выключенная индексация закрывает сайт", () => {
    expect(
      isSiteIndexable({ isActive: true, accessPassword: null, indexingEnabled: false }),
    ).toBe(false);
  });
});
