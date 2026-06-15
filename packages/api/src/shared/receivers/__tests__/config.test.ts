import { describe, expect, it } from "vitest";
import { parseReceiverConfig, receiverTypes, receiverDefByType } from "../index";

describe("receiver configSchema", () => {
  it("webhook требует валидный url", () => {
    expect(() => parseReceiverConfig("webhook", { url: "not-a-url" })).toThrow();
    const ok = parseReceiverConfig("webhook", { url: "https://example.com/hook" });
    expect(ok).toMatchObject({ url: "https://example.com/hook", method: "POST" });
  });

  it("telegram требует botToken и chatId", () => {
    expect(() => parseReceiverConfig("telegram", { botToken: "x" })).toThrow();
    const ok = parseReceiverConfig("telegram", { botToken: "123:abc", chatId: "-100" });
    expect(ok).toEqual({ botToken: "123:abc", chatId: "-100" });
  });

  it("email требует to (email)", () => {
    expect(() => parseReceiverConfig("email", { to: "nope" })).toThrow();
    const ok = parseReceiverConfig("email", { to: "sales@a.ru" });
    expect(ok).toMatchObject({ to: "sales@a.ru" });
  });

  it("неизвестный тип кидает ошибку", () => {
    expect(() => parseReceiverConfig("sms", {})).toThrow(/unknown receiver type/i);
  });

  it("реестр перечисляет все 3 типа", () => {
    expect(new Set(receiverTypes)).toEqual(new Set(["webhook", "telegram", "email"]));
    expect(receiverDefByType.get("webhook")?.label).toBeTruthy();
  });
});
