import { describe, expect, it } from "vitest";
import {
  normalizeSubmission,
  deriveTicketColumns,
  validateSubmission,
  ticketDisplayFields,
  type TicketField,
} from "../ticket-fields";

const F = (over: Partial<TicketField>): TicketField => ({
  key: "k", type: "name", label: "L", value: "v", ...over,
});

describe("normalizeSubmission", () => {
  it("возвращает input.fields как есть", () => {
    const fields = [F({ key: "1", type: "phone", label: "Телефон", value: "+7" })];
    expect(normalizeSubmission({ fields })).toEqual(fields);
  });
  it("синтезирует из плоских колонок (только непустые, с trim)", () => {
    expect(normalizeSubmission({ name: " Иван ", phone: "+7", email: "", message: "  " })).toEqual([
      { key: "name", type: "name", label: "Имя", value: "Иван" },
      { key: "phone", type: "phone", label: "Телефон", value: "+7" },
    ]);
  });
});

describe("deriveTicketColumns", () => {
  it("первый непустой строковый матч по типу; дубликаты — первый; чекбокс игнор", () => {
    const fields = [
      F({ type: "phone", label: "Тел агента", value: "+71" }),
      F({ type: "phone", label: "Тел клиента", value: "+72" }),
      F({ type: "email", label: "Почта", value: "a@b.ru" }),
      F({ type: "description", label: "Пожелания", value: "хочу студию" }),
      F({ type: "checkbox", label: "Согласие", value: true }),
    ];
    expect(deriveTicketColumns(fields)).toEqual({
      name: null, phone: "+71", email: "a@b.ru", message: "хочу студию",
    });
  });
  it("пустые/отсутствующие → null", () => {
    expect(deriveTicketColumns([F({ type: "name", value: "  " })])).toEqual({
      name: null, phone: null, email: null, message: null,
    });
  });
});

describe("validateSubmission", () => {
  const formDef = [
    { id: "n", type: "name", label: "Имя", required: false },
    { id: "e", type: "email", label: "Почта", required: true },
    { id: "p", type: "phone", label: "Телефон", required: false },
  ];
  it("обязательная почта заполнена → ok (телефона нет — норм)", () => {
    expect(validateSubmission([F({ key: "e", type: "email", value: "a@b.ru" })], formDef)).toEqual({ ok: true });
  });
  it("обязательная почта пуста → issue по её key", () => {
    const r = validateSubmission([F({ key: "n", type: "name", value: "Иван" })], formDef);
    expect(r.ok).toBe(false);
    expect((r as { issues: { key: string }[] }).issues.map((i) => i.key)).toContain("e");
  });
  it("заполненный email невалидного формата → issue", () => {
    const r = validateSubmission([F({ key: "e", type: "email", value: "не-почта" })], formDef);
    expect(r.ok).toBe(false);
  });
  it("required email невалидного формата → ровно один issue (формат, без дубля required)", () => {
    const r = validateSubmission([F({ key: "e", type: "email", value: "не-почта" })], formDef);
    expect(r.ok).toBe(false);
    const issues = (r as { issues: { key: string; message: string }[] }).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toMatch(/email/i);
  });
  it("обязательный непоставленный чекбокс → issue", () => {
    const def = [{ id: "c", type: "checkbox", label: "Согласие", required: true }];
    expect(validateSubmission([], def).ok).toBe(false);
    expect(validateSubmission([F({ key: "c", type: "checkbox", value: true })], def)).toEqual({ ok: true });
  });
  it("без формы → мягкий минимум: нужен телефон или почта", () => {
    expect(validateSubmission([F({ type: "name", value: "Иван" })], null).ok).toBe(false);
    expect(validateSubmission([F({ type: "phone", value: "+7" })], null)).toEqual({ ok: true });
  });
  it("форма ничего не требует + пусто → ok (намеренно)", () => {
    expect(validateSubmission([], [{ id: "n", type: "name", label: "Имя", required: false }])).toEqual({ ok: true });
  });
});

describe("ticketDisplayFields", () => {
  it("из additionalInfo.fields (чекбокс→Да, пустые отброшены)", () => {
    const ticket = {
      additionalInfo: { fields: [
        F({ type: "phone", label: "Тел", value: "+7" }),
        F({ type: "checkbox", label: "Согласие", value: true }),
        F({ type: "name", label: "Имя", value: "" }),
      ] },
      name: null, phone: null, email: null, message: null,
    };
    expect(ticketDisplayFields(ticket)).toEqual([
      { type: "phone", label: "Тел", value: "+7" },
      { type: "checkbox", label: "Согласие", value: "Да" },
    ]);
  });
  it("fallback на колонки для старых заявок", () => {
    const ticket = { additionalInfo: null, name: "Иван", phone: "+7", email: null, message: "привет" };
    expect(ticketDisplayFields(ticket)).toEqual([
      { type: "name", label: "Имя", value: "Иван" },
      { type: "phone", label: "Телефон", value: "+7" },
      { type: "description", label: "Сообщение", value: "привет" },
    ]);
  });
});
