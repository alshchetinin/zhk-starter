import type {
  ImportApartment,
  ImportBuilding,
  ImportData,
  ImportProject,
  ApartmentStatus,
} from "@zhk/macro";
import type {
  ProfitbaseHouse,
  ProfitbaseProject,
  ProfitbaseProperty,
} from "./client";

const STATUS_MAP: Record<string, ApartmentStatus> = {
  AVAILABLE: "free",
  SOLD: "sold",
  RESERVED: "paid_reservation",
  UNAVAILABLE: "corporate_reservation",
  BOOKED: "paid_reservation",
};

function mapStatus(raw: string): ApartmentStatus {
  return STATUS_MAP[raw.toUpperCase()] ?? "free";
}

export interface ProfitbaseAdapterInput {
  projects: ProfitbaseProject[];
  houses: ProfitbaseHouse[];
  properties: ProfitbaseProperty[];
  integrationId: string;
  siteId: string;
}

export function buildImportData(input: ProfitbaseAdapterInput): ImportData {
  const base = {
    integration_id: input.integrationId,
    tenant_id: input.siteId,
  };

  const projects: ImportProject[] = input.projects.map((p) => ({
    external_id: p.id.toString(),
    name: p.title,
    address: "Адрес",
    status: "active",
    ...base,
  }));

  const buildings: ImportBuilding[] = input.houses
    .filter((h) => h.projectId != null)
    .map((h) => ({
      external_id: h.id.toString(),
      name: h.title,
      external_project_id: h.projectId!.toString(),
      completion_date: h.developmentEndQuarter
        ? new Date(
            h.developmentEndQuarter.year,
            h.developmentEndQuarter.quarter * 3,
            0,
          )
        : null,
      ...base,
    }));

  const apartments: ImportApartment[] = input.properties
    .filter(
      (p) =>
        p.propertyType?.toLowerCase() !== "commercial" &&
        p.house_id != null &&
        p.projectId != null,
    )
    .map((p) => ({
      external_id: p.id.toString(),
      name: `№ ${p.number}`,
      apartment_number: p.number,
      area: p.area?.area_total ?? 0,
      price: p.price?.value ?? 0,
      old_price: 0,
      floor_number: p.floor ?? 0,
      rooms_count: p.rooms_amount ?? (p.studio ? 0 : 1),
      status: mapStatus(p.status),
      is_published: true,
      is_popular: false,
      is_studio: p.studio,
      is_apartment: false,
      monthly_mortgage_payment: 0,
      external_project_id: p.projectId.toString(),
      external_building_id: p.house_id.toString(),
      ...base,
    }));

  return { projects, buildings, apartments };
}
