import { describe, expect, it } from "vitest";
import { buildDeliveryContext } from "../payload";

const ticket = {
  id: "t1",
  name: "Иван",
  phone: "+79990000000",
  email: null,
  message: "Хочу 2-комнатную",
  type: "lead",
  source: "modal:callback",
  url: "https://site.ru/p",
  utm: { utm_source: "ya" },
  createdAt: new Date("2026-06-15T10:00:00Z"),
};
const site = { id: "s1", name: "ЖК Пример" };

describe("buildDeliveryContext", () => {
  it("маппит тикет и сайт, сериализует createdAt в ISO", () => {
    const ctx = buildDeliveryContext(ticket as never, site);
    expect(ctx.ticket.id).toBe("t1");
    expect(ctx.ticket.createdAt).toBe("2026-06-15T10:00:00.000Z");
    expect(ctx.site).toEqual({ id: "s1", name: "ЖК Пример" });
    expect(ctx.utm).toEqual({ utm_source: "ya" });
  });

  it("fields содержит только непустые стандартные поля с RU-лейблами", () => {
    const ctx = buildDeliveryContext(ticket as never, site);
    expect(ctx.fields).toEqual([
      { label: "Имя", value: "Иван" },
      { label: "Телефон", value: "+79990000000" },
      { label: "Сообщение", value: "Хочу 2-комнатную" },
    ]);
  });
});

describe("buildDeliveryContext: additionalInfo.fields", () => {
  const base = {
    id: "t1", name: "Иван", phone: "+71", email: null, message: null,
    type: "lead", source: null, url: null,
    utm: null, apartmentId: null, requestType: null, comment: null,
    externalId: null, integrationId: null, siteId: "s1",
    createdAt: new Date("2026-06-15T10:00:00Z"), updatedAt: new Date("2026-06-15T10:00:00Z"),
  };
  it("берёт fields из additionalInfo (два телефона + чекбокс)", () => {
    const ticket = {
      ...base,
      additionalInfo: { fields: [
        { key: "p1", type: "phone", label: "Тел агента", value: "+71" },
        { key: "p2", type: "phone", label: "Тел клиента", value: "+72" },
        { key: "w", type: "description", label: "Пожелания", value: "студию" },
        { key: "c", type: "checkbox", label: "Согласие", value: true },
      ] },
    };
    const ctx = buildDeliveryContext(ticket as never, { id: "s1", name: "ЖК" });
    expect(ctx.fields).toEqual([
      { label: "Тел агента", value: "+71" },
      { label: "Тел клиента", value: "+72" },
      { label: "Пожелания", value: "студию" },
      { label: "Согласие", value: "Да" },
    ]);
  });
  it("fallback на колонки если additionalInfo пуст; phone=null безопасен", () => {
    const ticket = { ...base, phone: null, additionalInfo: null };
    const ctx = buildDeliveryContext(ticket as never, { id: "s1", name: "ЖК" });
    expect(ctx.ticket.phone).toBeNull();
    expect(ctx.fields).toEqual([{ label: "Имя", value: "Иван" }]);
  });
});
