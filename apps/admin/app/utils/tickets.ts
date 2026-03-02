export type TicketType = "lead" | "callback" | "question" | "booking";

export const ticketTypeOptions = [
  { label: "Заявка", value: "lead" },
  { label: "Обратный звонок", value: "callback" },
  { label: "Вопрос", value: "question" },
  { label: "Бронирование", value: "booking" },
];

export const ticketTypeLabels: Record<TicketType, string> = {
  lead: "Заявка",
  callback: "Обратный звонок",
  question: "Вопрос",
  booking: "Бронирование",
};

export const ticketTypeColors: Record<TicketType, string> = {
  lead: "primary",
  callback: "warning",
  question: "neutral",
  booking: "success",
};
