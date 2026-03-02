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

export const integrationTypeEnum = pgEnum("integration_type", ["macro"]);

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
