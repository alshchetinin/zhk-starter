import type { MacroFlat, ApartmentStatus } from "../types";

export function getSectionId(flat: MacroFlat): string {
  return `${flat.geo_house_entrance}-${flat.parent_id}-${flat.complex_id}`;
}

export function getFloorId(flat: MacroFlat): string {
  return `${flat.estate_floor}-${getSectionId(flat)}`;
}

export function getNonResidentialFloorId(item: MacroFlat): string {
  return `${item.estate_floor}-${item.parent_id}-${item.complex_id}`;
}

export function getStatusName(flat: MacroFlat): ApartmentStatus {
  if (flat.is_sold) return "sold";
  if (flat.status_real === 32) return "corporate_reservation";
  if (flat.status_real === 30) return "paid_reservation";
  return "free";
}

export function getRealtyProperties(realty: MacroFlat) {
  return {
    external_id: realty.id?.toString(),
    is_published: Boolean(realty.is_published),
    is_popular: Boolean(realty.is_hot),
    price: realty.estate_price ?? 0,
    old_price: realty.estate_price_old ?? 0,
    name: realty.title,
    area: realty.estate_area,
    floor_number: realty.estate_floor,
    completion_date: formatDate(realty.estate_inServiceDate_human),
    external_project_id: realty.complex_id?.toString(),
    external_building_id: realty.parent_id?.toString(),
    status: getStatusName(realty),
  };
}

export function getApartmentLayoutName(flat: MacroFlat): string {
  return (
    flat.estate_planName ??
    `K${flat.estate_rooms}-${flat.estate_area}-${flat.geo_house_section}`
  );
}

export function formatDate(date: string | null): Date | null {
  if (!date) return null;
  const [day, month, year] = date.split(".");
  return new Date(`${month}-${day}-${year}`);
}

export function getUniqueObjects<T, R>(
  items: T[],
  mapper: (item: T) => R | null,
): R[] {
  const seen = new Set<string>();
  const result: R[] = [];

  for (const item of items) {
    const mapped = mapper(item);
    if (!mapped) continue;

    const key = JSON.stringify(
      (mapped as Record<string, unknown>).external_id ??
        (mapped as Record<string, unknown>).name,
    );

    if (!seen.has(key)) {
      seen.add(key);
      result.push(mapped);
    }
  }

  return result;
}
