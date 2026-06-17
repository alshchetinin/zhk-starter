import { describe, expect, it } from "vitest";
import {
  breadcrumbsConfigSchema,
  defaultBreadcrumbsConfig,
} from "../breadcrumbs";

describe("breadcrumbsConfigSchema", () => {
  it("пустой объект → дефолт auto + []", () => {
    expect(breadcrumbsConfigSchema.parse({})).toEqual({
      mode: "auto",
      items: [],
    });
  });

  it("валидный custom с элементами", () => {
    const parsed = breadcrumbsConfigSchema.parse({
      mode: "custom",
      items: [{ label: "Главная", href: "/" }, { label: "О нас" }],
    });
    expect(parsed.mode).toBe("custom");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[1]).toEqual({ label: "О нас" });
  });

  it("пустой label отбраковывается", () => {
    expect(() =>
      breadcrumbsConfigSchema.parse({ mode: "custom", items: [{ label: "" }] }),
    ).toThrow();
  });

  it("неизвестный mode отбраковывается", () => {
    expect(() => breadcrumbsConfigSchema.parse({ mode: "weird" })).toThrow();
  });

  it("пустой href отбраковывается", () => {
    expect(() =>
      breadcrumbsConfigSchema.parse({ mode: "custom", items: [{ label: "X", href: "" }] }),
    ).toThrow();
  });

  it("defaultBreadcrumbsConfig валиден и равен auto/[]", () => {
    expect(breadcrumbsConfigSchema.parse(defaultBreadcrumbsConfig)).toEqual({
      mode: "auto",
      items: [],
    });
  });
});
