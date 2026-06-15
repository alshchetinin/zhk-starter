import { describe, it, expect } from "vitest";
import { imageUrl, resolveImageAlt } from "../image-value";

describe("imageUrl", () => {
  it("строка возвращается как есть", () => {
    expect(imageUrl("https://s3/x.jpg")).toBe("https://s3/x.jpg");
  });
  it("из объекта берётся url", () => {
    expect(imageUrl({ url: "https://s3/x.jpg", alt: "Фасад" })).toBe("https://s3/x.jpg");
  });
  it("null/undefined → пустая строка", () => {
    expect(imageUrl(null)).toBe("");
    expect(imageUrl(undefined)).toBe("");
  });
});

describe("resolveImageAlt (приоритет per-usage → central → fallback → '')", () => {
  it("per-usage alt из объекта побеждает", () => {
    expect(resolveImageAlt({ url: "u", alt: "Из блока" }, "Центральный", "Заголовок")).toBe("Из блока");
  });
  it("при пустом per-usage берётся central", () => {
    expect(resolveImageAlt({ url: "u", alt: "" }, "Центральный", "Заголовок")).toBe("Центральный");
    expect(resolveImageAlt("u", "Центральный", "Заголовок")).toBe("Центральный");
  });
  it("при пустом central берётся fallback рендерера", () => {
    expect(resolveImageAlt("u", null, "Заголовок")).toBe("Заголовок");
  });
  it("ничего нет → пустая строка (декоративная)", () => {
    expect(resolveImageAlt("u", null, "")).toBe("");
  });
});
