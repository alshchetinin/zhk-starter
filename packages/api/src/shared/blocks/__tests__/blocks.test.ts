import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allBlocks, normalizeBlockData } from "../index";
import type { BlockType } from "../index";

/** Снимает обёртки ZodOptional/ZodNullable/ZodDefault рекурсивно (zod v4: у всех есть .unwrap()). */
function unwrap(schema: z.ZodType): z.ZodType {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrap(schema.unwrap() as z.ZodType);
  }
  return schema;
}

function blockShape(block: (typeof allBlocks)[number]): z.ZodRawShape {
  return (block.dataSchema as unknown as z.ZodObject<z.ZodRawShape>).shape;
}

describe("fields consistency", () => {
  for (const block of allBlocks) {
    it(`${block.type}: имена fields совпадают с defaultData и dataSchema`, () => {
      const fieldNames = block.fields.map((f) => f.name);
      // без дублей
      expect(new Set(fieldNames).size).toBe(fieldNames.length);
      // fields == ключи defaultData
      const defaultKeys = Object.keys(block.defaultData as Record<string, unknown>);
      expect([...fieldNames].sort()).toEqual([...defaultKeys].sort());
      // fields == ключи dataSchema (z.object shape)
      const shape = blockShape(block);
      expect(Object.keys(shape).sort()).toEqual([...fieldNames].sort());
    });

    const selectFields = block.fields.filter((f) => f.type === "select");
    if (selectFields.length > 0) {
      it(`${block.type}: select-поля — z.enum с теми же options`, () => {
        const shape = blockShape(block);
        for (const field of selectFields) {
          const schema = unwrap(shape[field.name] as z.ZodType);
          expect(schema).toBeInstanceOf(z.ZodEnum);
          expect((schema as z.ZodEnum).options).toEqual(field.options);
        }
      });
    }

    const repeaterFields = block.fields.filter((f) => f.type === "repeater");
    if (repeaterFields.length > 0) {
      it(`${block.type}: repeater-поля — z.array(z.object) с теми же subFields и min/max`, () => {
        const shape = blockShape(block);
        for (const field of repeaterFields) {
          const schema = unwrap(shape[field.name] as z.ZodType);
          expect(schema).toBeInstanceOf(z.ZodArray);
          const arr = schema as z.ZodArray<z.ZodObject<z.ZodRawShape>>;
          const subNames = (field.subFields ?? []).map((sf) => sf.name);
          expect(Object.keys(arr.element.shape).sort()).toEqual([...subNames].sort());
          // zod v4: min/max length массива агрегируются в _zod.bag (minimum/maximum)
          const bag = (arr as unknown as { _zod: { bag: { minimum?: number; maximum?: number } } })
            ._zod.bag;
          if (bag.minimum !== undefined) expect(bag.minimum).toBe(field.minItems);
          if (bag.maximum !== undefined) expect(bag.maximum).toBe(field.maxItems);
        }
      });
    }
  }
});

describe("normalizeBlockData", () => {
  it("подставляет default для отсутствующих ключей", () => {
    const data = normalizeBlockData("project-stats" as BlockType, { projectId: "p1" });
    expect(data).toEqual({ projectId: "p1", showFree: true, showTotal: true });
  });

  it("не перетирает существующие значения", () => {
    const data = normalizeBlockData("project-stats" as BlockType, {
      projectId: "p1",
      showFree: false,
      showTotal: false,
    });
    expect(data).toEqual({ projectId: "p1", showFree: false, showTotal: false });
  });

  it("терпит неизвестный тип блока", () => {
    const data = normalizeBlockData("nope" as BlockType, { a: 1 });
    expect(data).toEqual({ a: 1 });
  });

  it("null → полный defaultData", () => {
    const data = normalizeBlockData("project-stats" as BlockType, null);
    expect(data).toEqual({ projectId: "", showFree: true, showTotal: true });
  });

  it("сохраняет лишние ключи как есть", () => {
    const data = normalizeBlockData("project-stats" as BlockType, { legacy: 1 });
    expect(data).toEqual({ projectId: "", showFree: true, showTotal: true, legacy: 1 });
  });
});
