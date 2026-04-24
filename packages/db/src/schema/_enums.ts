import { pgEnum } from "drizzle-orm/pg-core";

export const apartmentStatusEnum = pgEnum("apartment_status", [
  "free",
  "paid_reservation",
  "corporate_reservation",
  "sold",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "planning",
  "hidden",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "pending",
  "loading",
  "failed",
  "success",
]);

export const integrationTypeEnum = pgEnum("integration_type", [
  "macro",
  "profitbase",
]);

export const syncLogTriggerEnum = pgEnum("sync_log_trigger", [
  "manual",
  "scheduled",
  "retry",
]);

export const syncLogStatusEnum = pgEnum("sync_log_status", [
  "running",
  "success",
  "failed",
  "cancelled",
]);

export const syncNotifyLevelEnum = pgEnum("sync_notify_level", [
  "none",
  "errors",
  "all",
]);

export const newsStatusEnum = pgEnum("news_status", [
  "draft",
  "published",
  "archived",
]);

export const pageStatusEnum = pgEnum("page_status", [
  "draft",
  "published",
  "archived",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "published",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "draft",
  "published",
  "archived",
]);

export const constructionProgressStatusEnum = pgEnum(
  "construction_progress_status",
  ["draft", "published"],
);

export const mortgageProgramStatusEnum = pgEnum("mortgage_program_status", [
  "active",
  "archived",
]);

export const purchaseMethodKindEnum = pgEnum("purchase_method_kind", [
  "mortgage",
  "installment",
  "maternal_capital",
  "trade_in",
  "military_mortgage",
  "subsidy",
  "cash",
  "custom",
]);

export const modalStatusEnum = pgEnum("modal_status", ["draft", "published"]);

export const ticketTypeEnum = pgEnum("ticket_type", [
  "lead",
  "callback",
  "question",
  "booking",
]);
