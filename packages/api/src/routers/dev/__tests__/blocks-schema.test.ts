import { describe, expect, it } from "vitest";
import { fieldSchema, blockInfoSchema } from "../blocks-schema";

describe("fieldSchema", () => {
  it("accepts a valid string field", () => {
    const result = fieldSchema.safeParse({
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts strings type", () => {
    const result = fieldSchema.safeParse({
      name: "items",
      type: "strings",
      label: "Элементы",
      required: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects select without options", () => {
    const result = fieldSchema.safeParse({
      name: "size",
      type: "select",
      label: "Размер",
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("select требует непустой options");
    }
  });

  it("rejects select with empty options array", () => {
    const result = fieldSchema.safeParse({
      name: "size",
      type: "select",
      label: "Размер",
      required: true,
      options: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("select требует непустой options");
    }
  });

  it("accepts select with non-empty options", () => {
    const result = fieldSchema.safeParse({
      name: "size",
      type: "select",
      label: "Размер",
      required: true,
      options: ["small", "large"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects required image field with default: null", () => {
    const result = fieldSchema.safeParse({
      name: "photo",
      type: "image",
      label: "Фото",
      required: true,
      default: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("default: null недопустим для обязательного image");
    }
  });

  it("accepts optional image field with default: null", () => {
    const result = fieldSchema.safeParse({
      name: "photo",
      type: "image",
      label: "Фото",
      required: false,
      default: null,
    });
    expect(result.success).toBe(true);
  });

  it("validates subFields recursively — select without options inside repeater fails", () => {
    const result = fieldSchema.safeParse({
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      subFields: [
        {
          name: "badSelect",
          type: "select",
          label: "Без опций",
          required: true,
          // intentionally missing options
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const allMessages = result.error.issues.map((i) => i.message);
      expect(allMessages).toContain("select требует непустой options");
    }
  });
});

describe("blockInfoSchema", () => {
  it("accepts a valid block definition", () => {
    const result = blockInfoSchema.safeParse({
      name: "hero-banner",
      label: "Баннер",
      description: "Главный баннер страницы",
      icon: "i-solar-home-linear",
      fields: [
        { name: "title", type: "string", label: "Заголовок", required: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects block with no fields", () => {
    const result = blockInfoSchema.safeParse({
      name: "empty-block",
      label: "Пустой",
      description: "Без полей",
      icon: "i-solar-home-linear",
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it("propagates guard errors from fields", () => {
    const result = blockInfoSchema.safeParse({
      name: "bad-block",
      label: "Плохой блок",
      description: "Блок с невалидным полем",
      icon: "i-solar-home-linear",
      fields: [
        { name: "size", type: "select", label: "Размер", required: true },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("select требует непустой options");
    }
  });
});
