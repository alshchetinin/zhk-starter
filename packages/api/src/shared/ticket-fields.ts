import { z } from "zod";

export const TICKET_FIELD_TYPES = ["name", "phone", "email", "description", "checkbox"] as const;
export type TicketFieldType = (typeof TICKET_FIELD_TYPES)[number];

export const ticketFieldSchema = z.object({
  key: z.string(),
  type: z.enum(TICKET_FIELD_TYPES),
  label: z.string(),
  value: z.union([z.string(), z.boolean()]),
});
export type TicketField = z.infer<typeof ticketFieldSchema>;
export const ticketFieldsSchema = z.array(ticketFieldSchema);

export interface FlatSubmission {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
}

function isFilled(f: TicketField): boolean {
  if (f.type === "checkbox") return f.value === true;
  return typeof f.value === "string" && f.value.trim().length > 0;
}

/** input.fields, либо синтез из плоских name/phone/email/message (только непустые). */
export function normalizeSubmission(
  input: { fields?: TicketField[] } & FlatSubmission,
): TicketField[] {
  if (input.fields && input.fields.length > 0) return input.fields;
  const out: TicketField[] = [];
  if (input.name?.trim()) out.push({ key: "name", type: "name", label: "Имя", value: input.name.trim() });
  if (input.phone?.trim()) out.push({ key: "phone", type: "phone", label: "Телефон", value: input.phone.trim() });
  if (input.email?.trim()) out.push({ key: "email", type: "email", label: "Email", value: input.email.trim() });
  if (input.message?.trim()) out.push({ key: "message", type: "description", label: "Сообщение", value: input.message.trim() });
  return out;
}

/** Первый непустой строковый матч по типу → первичные колонки. */
export function deriveTicketColumns(fields: TicketField[]): {
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
} {
  const first = (type: TicketFieldType): string | null => {
    const f = fields.find(
      (x) => x.type === type && typeof x.value === "string" && x.value.trim().length > 0,
    );
    return f ? (f.value as string).trim() : null;
  };
  return { name: first("name"), phone: first("phone"), email: first("email"), message: first("description") };
}

export interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  required: boolean;
}
export type ValidationResult = { ok: true } | { ok: false; issues: { key: string; message: string }[] };

const emailOk = (v: string) => z.string().email().safeParse(v).success;

/**
 * Валидация по определению формы; без формы — мягкий минимум (телефон ИЛИ почта).
 *
 * Инвариант: `TicketField.key` отправленного поля должен совпадать с `FormFieldDef.id`
 * соответствующего поля формы (клиент берёт key из field.id). Иначе required-поле не
 * найдётся и попадёт в issues.
 *
 * Дубля issues для «required email + невалидный формат» не бывает: непустая строка
 * проходит isFilled (required-блок молчит), формат ловится отдельным проходом.
 */
export function validateSubmission(
  fields: TicketField[],
  formDef: FormFieldDef[] | null,
): ValidationResult {
  const issues: { key: string; message: string }[] = [];

  // Формат email для любого заполненного email-поля.
  for (const f of fields) {
    if (f.type === "email" && typeof f.value === "string" && f.value.trim() && !emailOk(f.value.trim())) {
      issues.push({ key: f.key, message: "Некорректный email" });
    }
  }

  if (formDef) {
    for (const def of formDef) {
      if (!def.required) continue;
      const submitted = fields.find((f) => f.key === def.id);
      if (!submitted || !isFilled(submitted)) {
        issues.push({ key: def.id, message: `Поле «${def.label}» обязательно` });
      }
    }
  } else {
    const cols = deriveTicketColumns(fields);
    if (!cols.phone && !cols.email) {
      issues.push({ key: "_contact", message: "Нужен телефон или email" });
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

export interface DisplayField {
  type: TicketFieldType;
  label: string;
  value: string;
}

/** Поля для отображения: из additionalInfo.fields ИЛИ fallback на колонки (старые заявки). */
export function ticketDisplayFields(ticket: {
  additionalInfo: unknown;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
}): DisplayField[] {
  const ai = ticket.additionalInfo as { fields?: unknown } | null;
  if (Array.isArray(ai?.fields) && ai.fields.length) {
    return (ai.fields as TicketField[])
      .map((f) => ({
        type: f.type,
        label: f.label,
        value: f.type === "checkbox" ? (f.value ? "Да" : "") : String(f.value ?? ""),
      }))
      .filter((f) => f.value !== "");
  }
  const out: DisplayField[] = [];
  if (ticket.name) out.push({ type: "name", label: "Имя", value: ticket.name });
  if (ticket.phone) out.push({ type: "phone", label: "Телефон", value: ticket.phone });
  if (ticket.email) out.push({ type: "email", label: "Email", value: ticket.email });
  if (ticket.message) out.push({ type: "description", label: "Сообщение", value: ticket.message });
  return out;
}
