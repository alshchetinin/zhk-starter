import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverTelegram, formatTelegramMessage } from "../telegram";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: "Иван", phone: "+79990000000", email: null, message: "Привет", type: "lead", source: "modal:cb", url: "https://s.ru", createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК Пример" },
  fields: [
    { label: "Имя", value: "Иван" },
    { label: "Телефон", value: "+79990000000" },
    { label: "Сообщение", value: "Привет" },
  ],
} satisfies DeliveryContext;

afterEach(() => vi.restoreAllMocks());

describe("formatTelegramMessage", () => {
  it("включает имя сайта, лейблы полей и источник", () => {
    const msg = formatTelegramMessage(ctx);
    expect(msg).toContain("ЖК Пример");
    expect(msg).toContain("Имя:");
    expect(msg).toContain("+79990000000");
    expect(msg).toContain("modal:cb");
  });
});

describe("deliverTelegram", () => {
  it("res.ok → ok, бьёт в Bot API с chat_id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await deliverTelegram(ctx, { botToken: "123:abc", chatId: "-100" });
    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/bot123:abc/sendMessage");
    expect(JSON.parse(String(init?.body)).chat_id).toBe("-100");
  });

  it("не-ok ответ → error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad", { status: 400 }));
    const res = await deliverTelegram(ctx, { botToken: "x", chatId: "y" });
    expect(res.ok).toBe(false);
  });
});
