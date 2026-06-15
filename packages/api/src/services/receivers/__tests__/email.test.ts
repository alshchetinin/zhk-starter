import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: "Иван", phone: "+7", email: null, message: "Привет", type: "lead", source: null, url: null, createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК Пример" },
  fields: [{ label: "Имя", value: "Иван" }, { label: "Телефон", value: "+7" }],
} satisfies DeliveryContext;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("deliverEmail", () => {
  it("no-op error без сконфигуренного SMTP", async () => {
    vi.doMock("../smtp", () => ({ getMailer: () => null }));
    const { deliverEmail } = await import("../email");
    const res = await deliverEmail(ctx, { to: "sales@a.ru" });
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toMatch(/SMTP/i);
  });

  it("шлёт письмо через mailer → ok", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "1" });
    vi.doMock("../smtp", () => ({ getMailer: () => ({ sendMail }), getFrom: () => "noreply@a.ru" }));
    const { deliverEmail } = await import("../email");
    const res = await deliverEmail(ctx, { to: "sales@a.ru", subject: "Тема" });
    expect(res).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledOnce();
    const arg = sendMail.mock.calls[0]![0];
    expect(arg.to).toBe("sales@a.ru");
    expect(arg.subject).toBe("Тема");
    expect(arg.from).toBe("noreply@a.ru");
    expect(arg.text).toContain("Иван");
  });

  it("экранирует HTML в значениях полей (защита от инъекции)", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "1" });
    vi.doMock("../smtp", () => ({ getMailer: () => ({ sendMail }), getFrom: () => "noreply@a.ru" }));
    const { deliverEmail } = await import("../email");
    const xssCtx = {
      ...ctx,
      fields: [{ label: "Имя", value: "<script>alert(1)</script>" }],
    } satisfies DeliveryContext;
    await deliverEmail(xssCtx, { to: "sales@a.ru" });
    const arg = sendMail.mock.calls[0]![0];
    expect(arg.html).not.toContain("<script>");
    expect(arg.html).toContain("&lt;script&gt;");
  });
});
