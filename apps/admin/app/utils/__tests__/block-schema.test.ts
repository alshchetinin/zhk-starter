import { describe, expect, it } from "vitest";
import type { BlockField } from "@zhk/api/shared/blocks";
import {
  serializeBlockField,
  buildBlockPayload,
  isBlockFormValid,
  type BlockMetaForm,
} from "../block-schema";

const validMeta: BlockMetaForm = {
  name: "test-block",
  label: "Тест",
  description: "Описание",
  icon: "i-solar-box-linear",
  category: "none",
};

describe("serializeBlockField", () => {
  it("сохраняет default (round-trip), включая falsy-значения", () => {
    const out = serializeBlockField({
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
      default: "Привет",
    });
    expect(out.default).toBe("Привет");

    const zero = serializeBlockField({
      name: "count",
      type: "number",
      label: "Кол-во",
      required: true,
      default: 0,
    });
    expect(zero.default).toBe(0);

    const noDefault = serializeBlockField({
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
    });
    expect("default" in noDefault).toBe(false);
  });

  it("опускает minItems/maxItems если это не number (пустой UInput эмитит \"\")", () => {
    const out = serializeBlockField({
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      minItems: "" as unknown as number,
      maxItems: "" as unknown as number,
      subFields: [{ name: "t", type: "string", label: "T", required: true }],
    });
    expect("minItems" in out).toBe(false);
    expect("maxItems" in out).toBe(false);
  });

  it("сохраняет легитимный 0 для minItems и числа для maxItems", () => {
    const out = serializeBlockField({
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      minItems: 0,
      maxItems: 6,
      subFields: [{ name: "t", type: "string", label: "T", required: true }],
    });
    expect(out.minItems).toBe(0);
    expect(out.maxItems).toBe(6);
  });

  it("options только у select: трим и фильтр пустых", () => {
    const sel = serializeBlockField({
      name: "size",
      type: "select",
      label: "Размер",
      required: true,
      options: [" small ", "", "large"],
    });
    expect(sel.options).toEqual(["small", "large"]);

    const str = serializeBlockField({
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
      options: ["мусор"],
    });
    expect("options" in str).toBe(false);
  });

  it("сериализует subFields рекурсивно (трим, default переживает)", () => {
    const out = serializeBlockField({
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      subFields: [
        {
          name: "  title  ",
          type: "string",
          label: " Заголовок ",
          required: true,
          default: "abc",
        },
      ],
    });
    expect(out.subFields).toEqual([
      {
        name: "title",
        type: "string",
        label: "Заголовок",
        required: true,
        default: "abc",
      },
    ]);
  });

  it("тримит name и label", () => {
    const out = serializeBlockField({
      name: " title ",
      type: "string",
      label: " Заголовок ",
      required: false,
    });
    expect(out.name).toBe("title");
    expect(out.label).toBe("Заголовок");
  });
});

describe("buildBlockPayload", () => {
  it("опускает category=none и тримит мету", () => {
    const payload = buildBlockPayload(
      { ...validMeta, name: " test-block ", category: "none" },
      [{ name: "t", type: "string", label: "T", required: true }],
    );
    expect(payload.name).toBe("test-block");
    expect("category" in payload).toBe(false);
  });

  it("включает category если выбрана", () => {
    const payload = buildBlockPayload({ ...validMeta, category: "content" }, [
      { name: "t", type: "string", label: "T", required: true },
    ]);
    expect((payload as { category?: string }).category).toBe("content");
  });
});

describe("isBlockFormValid", () => {
  const stringField: BlockField = {
    name: "title",
    type: "string",
    label: "Заголовок",
    required: true,
  };

  it("валидная форма проходит", () => {
    expect(isBlockFormValid(validMeta, [stringField])).toBe(true);
  });

  it("false без полей или с пустой метой", () => {
    expect(isBlockFormValid(validMeta, [])).toBe(false);
    expect(isBlockFormValid({ ...validMeta, name: "" }, [stringField])).toBe(false);
  });

  it("false для select без опций", () => {
    const sel: BlockField = {
      name: "size",
      type: "select",
      label: "Размер",
      required: true,
      options: [],
    };
    expect(isBlockFormValid(validMeta, [sel])).toBe(false);
    expect(
      isBlockFormValid(validMeta, [{ ...sel, options: ["small", "large"] }]),
    ).toBe(true);
  });

  it("false для repeater с subField без name", () => {
    const rep: BlockField = {
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      subFields: [{ name: "", type: "string", label: "T", required: true }],
    };
    expect(isBlockFormValid(validMeta, [rep])).toBe(false);
  });

  it("false для repeater с вложенным select без опций", () => {
    const rep: BlockField = {
      name: "items",
      type: "repeater",
      label: "Элементы",
      required: true,
      subFields: [
        { name: "size", type: "select", label: "Размер", required: true },
      ],
    };
    expect(isBlockFormValid(validMeta, [rep])).toBe(false);
  });
});
