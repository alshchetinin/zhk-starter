import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allBlocks, normalizeBlockData } from "../index";
import type { BlockType } from "../index";

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
      const shape = (block.dataSchema as unknown as z.ZodObject<z.ZodRawShape>).shape;
      expect(Object.keys(shape).sort()).toEqual([...fieldNames].sort());
    });
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
});
