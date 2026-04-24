import type {
  ImportApartment,
  ImportApartmentLayout,
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

  const residential = input.properties.filter(
    (p) =>
      p.propertyType?.toLowerCase() !== "commercial" &&
      p.house_id != null &&
      p.projectId != null,
  );

  const layoutByCode = new Map<string, ProfitbaseProperty>();
  for (const p of residential) {
    if (p.layoutCode && !layoutByCode.has(p.layoutCode)) {
      layoutByCode.set(p.layoutCode, p);
    }
  }

  const apartment_layouts: ImportApartmentLayout[] = Array.from(
    layoutByCode.entries(),
  ).map(([code, p]) => {
    const prices = residential
      .filter((x) => x.layoutCode === code)
      .map((x) => x.price?.value ?? 0);
    const floorNums = residential
      .filter((x) => x.layoutCode === code)
      .map((x) => x.floor ?? 0);
    return {
      external_id: code,
      name: `${p.rooms_amount ?? (p.studio ? 0 : 1)}-комн. ${p.area?.area_total ?? 0} м²`,
      area: p.area?.area_total ?? 0,
      floor_range: `[${Math.min(...floorNums)}, ${Math.max(...floorNums)}]`,
      price_range: `[${Math.min(...prices)}, ${Math.max(...prices)}]`,
      rooms_count: p.rooms_amount ?? (p.studio ? 0 : 1),
      default_layout_image: p.planImages?.[0]?.source ?? null,
      three_d_layout_image: null,
      ...base,
    };
  });

  const apartments: ImportApartment[] = residential.map((p) => ({
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
    external_project_id: p.projectId!.toString(),
    external_building_id: p.house_id!.toString(),
    external_apartment_layout_id: p.layoutCode ?? null,
    ...base,
  }));

  return { projects, buildings, apartment_layouts, apartments };
}
