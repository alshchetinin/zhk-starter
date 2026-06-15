import { describe, expect, it } from "vitest";
import { resolveReceiverIds } from "../resolve";

const enabled = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];

describe("resolveReceiverIds", () => {
  it("форма найдена → пересечение её receiverIds с enabled", () => {
    expect(resolveReceiverIds({ receiverIds: ["r2", "r3", "rX"] }, enabled)).toEqual(["r2", "r3"]);
  });

  it("форма найдена, но receiverIds пуст → пусто (явный выбор «никто»)", () => {
    expect(resolveReceiverIds({ receiverIds: [] }, enabled)).toEqual([]);
  });

  it("форма не найдена (null) → все enabled (бэк-компат)", () => {
    expect(resolveReceiverIds(null, enabled)).toEqual(["r1", "r2", "r3"]);
  });
});
