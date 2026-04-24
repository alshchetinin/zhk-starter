import type {
  ImportApartment,
  ImportApartmentLayout,
  ImportBuilding,
  ImportData,
  ImportProject,
  ImportSection,
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

  function sectionKey(p: (typeof residential)[number]): string {
    const s = p.sectionNumber ?? p.sectionName ?? "default";
    return `${p.house_id}-${s}`;
  }

  function sectionName(p: (typeof residential)[number]): string {
    return (
      p.sectionName ??
      (p.sectionNumber != null ? `Секция ${p.sectionNumber}` : "Секция")
    );
  }

  const sectionMap = new Map<
    string,
    { sample: (typeof residential)[number]; maxFloor: number }
  >();
  for (const p of residential) {
    const key = sectionKey(p);
    const floor = p.floor ?? 0;
    const cur = sectionMap.get(key);
    if (!cur) sectionMap.set(key, { sample: p, maxFloor: floor });
    else if (floor > cur.maxFloor) cur.maxFloor = floor;
  }

  const sections: ImportSection[] = Array.from(sectionMap.entries()).map(
    ([key, { sample, maxFloor }]) => ({
      external_id: key,
      external_building_id: sample.house_id.toString(),
      name: sectionName(sample),
      floors_count: maxFloor,
      ...base,
    }),
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
    const group = residential.filter((x) => x.layoutCode === code);
    const prices = group.map((x) => x.price?.value ?? 0);
    const floorNums = group.map((x) => x.floor ?? 0);
    const firstWithImage = group.find(
      (x) => x.planImages && x.planImages.length > 0 && x.planImages[0]?.source,
    );
    const image = firstWithImage?.planImages?.[0]?.source ?? null;
    return {
      external_id: code,
      name: `${p.rooms_amount ?? (p.studio ? 0 : 1)}-комн. ${p.area?.area_total ?? 0} м²`,
      area: p.area?.area_total ?? 0,
      floor_range: `[${Math.min(...floorNums)}, ${Math.max(...floorNums)}]`,
      price_range: `[${Math.min(...prices)}, ${Math.max(...prices)}]`,
      rooms_count: p.rooms_amount ?? (p.studio ? 0 : 1),
      default_layout_image: image,
      three_d_layout_image: null,
      ...base,
    };
  });

  const withoutLayoutCode = residential.filter((p) => !p.layoutCode).length;
  const withoutImage = residential.filter(
    (p) => !p.planImages?.length,
  ).length;
  console.log(
    `[profitbase] properties=${residential.length} layouts=${apartment_layouts.length} withoutLayoutCode=${withoutLayoutCode} withoutPlanImages=${withoutImage}`,
  );
  if (apartment_layouts.length && !apartment_layouts.some((l) => l.default_layout_image)) {
    console.log(
      `[profitbase] sample property planImages:`,
      JSON.stringify(residential[0]?.planImages ?? null),
    );
  }

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
    external_section_id: sectionKey(p),
    external_apartment_layout_id: p.layoutCode ?? null,
    ...base,
  }));

  return { projects, buildings, sections, apartment_layouts, apartments };
}
