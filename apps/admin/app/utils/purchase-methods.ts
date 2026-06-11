export type PurchaseMethodKind =
  | "mortgage"
  | "installment"
  | "maternal_capital"
  | "trade_in"
  | "military_mortgage"
  | "subsidy"
  | "cash"
  | "custom";

export const purchaseMethodKindLabels: Record<PurchaseMethodKind, string> = {
  mortgage: "Ипотека",
  installment: "Рассрочка",
  maternal_capital: "Материнский капитал",
  trade_in: "Trade-in",
  military_mortgage: "Военная ипотека",
  subsidy: "Субсидия / господдержка",
  cash: "100% оплата",
  custom: "Другое",
};

export const purchaseMethodKindIcons: Record<PurchaseMethodKind, string> = {
  mortgage: "i-solar-dollar-minimalistic-linear",
  installment: "i-solar-calendar-linear",
  maternal_capital: "i-tabler-baby-carriage",
  trade_in: "i-solar-transfer-horizontal-linear",
  military_mortgage: "i-solar-medal-star-linear",
  subsidy: "i-solar-diploma-linear",
  cash: "i-solar-banknote-2-linear",
  custom: "i-solar-menu-dots-linear",
};

export const purchaseMethodKindOptions = (
  Object.keys(purchaseMethodKindLabels) as PurchaseMethodKind[]
).map((value) => ({ value, label: purchaseMethodKindLabels[value] }));

export interface PurchaseMethodFieldSpec {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "url";
  hint?: string;
  placeholder?: string;
}

/**
 * Kind-specific fields stored in the `data` JSONB column.
 * Common fields (title, description, icon, sortOrder, isActive, projects) live in columns.
 */
export const purchaseMethodKindFields: Record<
  PurchaseMethodKind,
  PurchaseMethodFieldSpec[]
> = {
  mortgage: [
    { name: "conditions", label: "Условия", type: "textarea" },
    {
      name: "partnerBanks",
      label: "Банки-партнёры (через запятую)",
      type: "text",
    },
  ],
  installment: [
    { name: "firstPaymentPercent", label: "Первый взнос, %", type: "text" },
    { name: "termMonths", label: "Срок, мес.", type: "number" },
    { name: "zeroPercent", label: "Беспроцентная", type: "boolean" },
    { name: "partnerName", label: "Партнёр / застройщик", type: "text" },
    { name: "conditions", label: "Условия", type: "textarea" },
  ],
  maternal_capital: [
    { name: "amount", label: "Сумма, ₽", type: "text" },
    { name: "conditions", label: "Условия использования", type: "textarea" },
  ],
  trade_in: [
    { name: "partnerName", label: "Партнёр", type: "text" },
    { name: "conditions", label: "Условия", type: "textarea" },
  ],
  military_mortgage: [
    { name: "maxLoanAmount", label: "Макс. сумма, ₽", type: "text" },
    { name: "bankName", label: "Банк", type: "text" },
    { name: "conditions", label: "Условия", type: "textarea" },
  ],
  subsidy: [
    { name: "programName", label: "Программа", type: "text" },
    { name: "amount", label: "Сумма", type: "text" },
    { name: "sourceUrl", label: "Ссылка на источник", type: "url" },
    { name: "conditions", label: "Условия", type: "textarea" },
  ],
  cash: [
    { name: "discountPercent", label: "Скидка, %", type: "text" },
    { name: "conditions", label: "Условия", type: "textarea" },
  ],
  custom: [{ name: "conditions", label: "Описание условий", type: "textarea" }],
};
