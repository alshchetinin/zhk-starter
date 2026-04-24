import type {
  ImportApartment,
  ImportApartmentLayout,
  ImportBuilding,
  ImportCommercial,
  ImportData,
  ImportNonResidentialFloor,
  ImportNonResidentialRealty,
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

type PropertyKind = "apartment" | "commerce" | "parking" | "storage";

function presetText(p: ProfitbaseProperty): string {
  if (!p.preset) return "";
  if (typeof p.preset === "string") return p.preset;
  return [p.preset.name, p.preset.alias].filter(Boolean).join(" ");
}

function classify(p: ProfitbaseProperty): PropertyKind {
  const purpose = (p.typePurpose ?? "").toLowerCase();
  const hints = `${purpose} ${p.layout_type ?? ""} ${presetText(p)}`.toLowerCase();

  if (/parking|garage|паркинг|машино/.test(hints)) return "parking";
  if (/storage|cellar|кладов|pantry/.test(hints)) return "storage";
  if (/commerc|office|retail|коммерц|офис|магазин/.test(hints)) return "commerce";
  if (/apartment|flat|living|квартир|жил/.test(hints)) return "apartment";
  // Fallback: если тип назначения не распознан — считаем квартирой.
  return "apartment";
}

function nonResFloorId(p: ProfitbaseProperty): string {
  return `${p.house_id}-nrf-${p.floor ?? 0}`;
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

  const validProps = input.properties.filter(
    (p) => p.house_id != null && p.projectId != null,
  );

  const classified = validProps.map((p) => ({ p, kind: classify(p) }));
  const residential = classified
    .filter((x) => x.kind === "apartment")
    .map((x) => x.p);
  const parkingProps = classified
    .filter((x) => x.kind === "parking")
    .map((x) => x.p);
  const storageProps = classified
    .filter((x) => x.kind === "storage")
    .map((x) => x.p);
  const commerceProps = classified
    .filter((x) => x.kind === "commerce")
    .map((x) => x.p);
  const commercialAll = [...parkingProps, ...storageProps, ...commerceProps];

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

  // Нежилые этажи: уникальные (house_id, floor) по всем нежилым лотам
  const nonResFloorSet = new Map<string, ProfitbaseProperty>();
  for (const p of commercialAll) {
    const id = nonResFloorId(p);
    if (!nonResFloorSet.has(id)) nonResFloorSet.set(id, p);
  }

  const non_residential_floors: ImportNonResidentialFloor[] = Array.from(
    nonResFloorSet.values(),
  ).map((p) => ({
    external_id: nonResFloorId(p),
    floor_number: p.floor ?? 0,
    external_project_id: p.projectId!.toString(),
    external_building_id: p.house_id!.toString(),
    ...base,
  }));

  const commerce: ImportCommercial[] = commerceProps.map((p) => ({
    external_id: p.id.toString(),
    name: `№ ${p.number}`,
    area: p.area?.area_total ?? 0,
    price: p.price?.value ?? 0,
    old_price: 0,
    floor_number: p.floor ?? 0,
    status: mapStatus(p.status),
    is_published: true,
    is_popular: false,
    commerce_number: p.number,
    category: p.typePurpose ?? null,
    layout_image: p.planImages?.[0]?.source ?? null,
    external_project_id: p.projectId!.toString(),
    external_building_id: p.house_id!.toString(),
    external_floor_id: nonResFloorId(p),
    ...base,
  }));

  const mapNonResidential = (
    props: ProfitbaseProperty[],
  ): ImportNonResidentialRealty[] =>
    props.map((p) => ({
      external_id: p.id.toString(),
      name: `№ ${p.number}`,
      area: p.area?.area_total ?? 0,
      price: p.price?.value ?? 0,
      old_price: 0,
      floor_number: p.floor ?? 0,
      status: mapStatus(p.status),
      is_published: true,
      is_popular: false,
      external_project_id: p.projectId!.toString(),
      external_building_id: p.house_id!.toString(),
      external_floor_id: nonResFloorId(p),
      ...base,
    }));

  const parking = mapNonResidential(parkingProps);
  const storage = mapNonResidential(storageProps);

  const withoutLayoutCode = residential.filter((p) => !p.layoutCode).length;
  const withoutImage = residential.filter(
    (p) => !p.planImages?.length,
  ).length;
  console.log(
    `[profitbase] apartments=${apartments.length} layouts=${apartment_layouts.length} commerce=${commerce.length} parking=${parking.length} storage=${storage.length} non_res_floors=${non_residential_floors.length} withoutLayoutCode=${withoutLayoutCode} withoutPlanImages=${withoutImage}`,
  );

  return {
    projects,
    buildings,
    sections,
    apartment_layouts,
    apartments,
    commerce,
    parking,
    storage,
    non_residential_floors,
  };
}
