import { describe, expect, it } from "vitest";
import { deliverers } from "../index";
import { receiverTypes } from "../../../shared/receivers";

describe("deliverers registry", () => {
  it("каждому типу метаданных соответствует deliverer и наоборот", () => {
    expect(new Set(Object.keys(deliverers))).toEqual(new Set(receiverTypes));
  });

  it("все deliverers — функции", () => {
    for (const fn of Object.values(deliverers)) {
      expect(typeof fn).toBe("function");
    }
  });
});
