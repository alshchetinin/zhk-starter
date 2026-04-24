export function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
