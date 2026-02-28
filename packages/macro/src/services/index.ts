import type {
  MacroFlat,
  MacroPromo,
  FloorPlans,
  ImportCity,
  ImportTag,
  ImportProject,
  ImportBuilding,
  ImportSection,
  ImportEntrance,
  ImportFloor,
  ImportApartmentLayout,
  ImportApartmentLayoutTag,
  ImportApartment,
  ImportCommercial,
  ImportNonResidentialFloor,
  ImportNonResidentialRealty,
  ImportPromo,
  ImportApartmentPromotion,
  ImportDecoration,
} from "../types";
import {
  getUniqueObjects,
  getSectionId,
  getFloorId,
  getNonResidentialFloorId,
  getRealtyProperties,
  getApartmentLayoutName,
  formatDate,
} from "../utils";

interface ServiceContext {
  integrationId: string;
  tenantId: string;
}

export function createMacroServices(ctx: ServiceContext) {
  const { integrationId, tenantId } = ctx;
  const base = { integration_id: integrationId, tenant_id: tenantId };

  function getCities(flats: MacroFlat[]): ImportCity[] {
    return getUniqueObjects(flats, (flat) => ({
      external_id: flat.geo_city?.toString(),
      name: flat.geo_city_human,
      ...base,
    }));
  }

  function getTags(flats: MacroFlat[]): ImportTag[] {
    const tags = flats.flatMap((flat) => flat.tags?.split(",") ?? []);
    return getUniqueObjects(tags, (tag) => {
      const name = tag?.trim();
      if (!name) return null;
      return { name, ...base };
    });
  }

  function getPromos(promos: MacroPromo[]): ImportPromo[] {
    return promos.map((promo) => ({
      external_id: promo.id?.toString(),
      name: promo.title,
      description: promo.description,
      date_start: formatDate(promo.date_from),
      date_end: formatDate(promo.date_to),
      ...base,
    }));
  }

  function getProjects(flats: MacroFlat[]): ImportProject[] {
    return getUniqueObjects(flats, (flat) => ({
      external_id: flat.complex_id?.toString(),
      name: flat.geo_complex_human ?? "Project Name",
      address: "Адрес",
      coordinates: flats[0]?.geo_coords,
      status: "active",
      external_city_id: flat.geo_city?.toString(),
      ...base,
    }));
  }

  function getBuildings(flats: MacroFlat[]): ImportBuilding[] {
    return getUniqueObjects(flats, (flat) => ({
      external_id: flat.parent_id?.toString(),
      name:
        flat.estate_public_house_name ??
        `${flat.geo_complex_human} ${flat.geo_house}`,
      external_project_id: flat.complex_id?.toString(),
      completion_date: formatDate(flat.estate_inServiceDate_human),
      ...base,
    }));
  }

  function getSections(flats: MacroFlat[]): ImportSection[] {
    return getUniqueObjects(flats, (flat) => ({
      external_building_id: flat.parent_id?.toString(),
      floors_count:
        flat.estate_floors_in_entrance ?? flat.estate_floors_in_house ?? 0,
      name:
        flat.geo_house_section ?? flat.geo_house_entrance?.toString(),
      external_id: getSectionId(flat),
      ...base,
    }));
  }

  function getEntrances(flats: MacroFlat[]): ImportEntrance[] {
    return getUniqueObjects(flats, (flat) => ({
      external_building_id: flat.parent_id?.toString(),
      name: flat.geo_house_entrance?.toString() ?? "1",
      floors_count:
        flat.estate_floors_in_entrance ?? flat.estate_floors_in_house ?? 0,
      external_section_id: getSectionId(flat),
      external_id: getSectionId(flat),
      ...base,
    }));
  }

  function getFloors(
    flats: MacroFlat[],
    floorPlans: FloorPlans,
  ): ImportFloor[] {
    return getUniqueObjects(flats, (flat) => {
      const planImage = floorPlans[flat.parent_id]?.find(
        (plan) =>
          flat.estate_floor?.toString() === plan.floor &&
          plan.entrance === flat.geo_house_entrance?.toString() &&
          plan.file_ext !== "svg",
      );

      return {
        external_section_id: getSectionId(flat),
        external_entrance_id: getSectionId(flat),
        external_id: getFloorId(flat),
        floor_number: flat.estate_floor,
        svg_scheme: null,
        floor_image: planImage?.file_url ?? null,
        ...base,
      };
    });
  }

  function getApartmentLayouts(
    flats: MacroFlat[],
  ): ImportApartmentLayout[] {
    return getUniqueObjects(flats, (flat) => {
      const filterFunc = flat.estate_planName
        ? (f: MacroFlat) => f.estate_planName === flat.estate_planName
        : (f: MacroFlat) =>
            flat.geo_house_section === f.geo_house_section &&
            flat.estate_area === f.estate_area &&
            flat.estate_rooms === f.estate_rooms;

      const prices = flats.filter(filterFunc).map((f) => f.estate_price);
      const floors = flats.filter(filterFunc).map((f) => f.estate_floor);

      return {
        external_id: flat.plan_id?.toString(),
        name: getApartmentLayoutName(flat),
        area: flat.estate_area,
        floor_range: `[${Math.min(...floors)}, ${Math.max(...floors)}]`,
        price_range: `[${Math.min(...prices)}, ${Math.max(...prices)}]`,
        rooms_count: flat.estate_rooms ?? 1,
        ceiling_height: flat.estate_ceilingHeight_flat ?? 0,
        default_layout_image: flat.plan_image || null,
        three_d_layout_image: null,
        ...base,
      };
    })
      .filter(
        (layout, index, self) =>
          index ===
          self.findIndex((l) => l.external_id === layout.external_id),
      )
      .map((layout) => ({
        ...layout,
        id: layout.external_id ?? crypto.randomUUID(),
        external_id: layout.external_id ?? crypto.randomUUID(),
      }));
  }

  function getApartments(flats: MacroFlat[]): ImportApartment[] {
    return flats.map((flat) => ({
      ...getRealtyProperties(flat),
      external_floor_id: getFloorId(flat),
      three_d_tour_url: flat.estate_pano ?? null,
      rooms_count: flat.estate_rooms ?? 1,
      is_studio: flat.estate_studia ?? false,
      is_apartment: flat.estate_apartments ?? false,
      apartment_number: flat.geo_flatnum,
      external_section_id: getSectionId(flat),
      external_entrance_id: getSectionId(flat),
      monthly_mortgage_payment: 0,
      window_view: flat.estate_windowView ?? null,
      ceiling_height: flat.estate_ceilingHeight_flat ?? 0,
      external_apartment_layout_id: flat.plan_id?.toString() ?? null,
      external_decoration_id: flat.restoration_id?.toString() ?? null,
      ...base,
    }));
  }

  function getCommercial(commercial: MacroFlat[]): ImportCommercial[] {
    return commercial.map((item) => ({
      ...getRealtyProperties(item),
      commerce_number: item.geo_flatnum,
      category: item.estate_category_type_human ?? null,
      layout_image: item.plan_image || null,
      external_floor_id: getNonResidentialFloorId(item),
      ...base,
    }));
  }

  function getNonResidentialFloors(
    realty: MacroFlat[],
    floorPlans: FloorPlans,
  ): ImportNonResidentialFloor[] {
    return getUniqueObjects(realty, (item) => {
      const planImage = floorPlans[item.parent_id]?.find(
        (plan) =>
          item.estate_floor?.toString() === plan.floor &&
          plan.entrance === item.geo_house_entrance?.toString() &&
          plan.file_ext !== "svg",
      );

      return {
        external_id: getNonResidentialFloorId(item),
        floor_number: item.estate_floor,
        external_project_id: item.complex_id?.toString(),
        external_building_id: item.parent_id?.toString(),
        svg_scheme: null,
        floor_image: planImage?.file_url ?? null,
        ...base,
      };
    });
  }

  function getNonResidentialRealty(
    realty: MacroFlat[],
  ): ImportNonResidentialRealty[] {
    return realty.map((item) => ({
      ...getRealtyProperties(item),
      external_floor_id: getNonResidentialFloorId(item),
      ...base,
    }));
  }

  function getApartmentLayoutTags(
    flats: MacroFlat[],
    apartmentLayouts: ImportApartmentLayout[],
    tags: ImportTag[],
  ): ImportApartmentLayoutTag[] {
    const result: ImportApartmentLayoutTag[] = [];
    const seen = new Set<string>();

    for (const flat of flats) {
      const layout = apartmentLayouts.find(
        (l) => l.external_id === flat.plan_id?.toString(),
      );
      const flatTags =
        flat.tags
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [];

      for (const tagName of flatTags) {
        const tag = tags.find((t) => t.name === tagName);
        if (!layout || !tag) continue;

        const key = `${layout.external_id}||${tag.name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        result.push({
          external_layout_id: layout.external_id,
          tag_name: tag.name,
          ...base,
        });
      }
    }

    return result;
  }

  function getApartmentPromotions(
    flats: MacroFlat[],
    promotions: ImportPromo[],
  ): ImportApartmentPromotion[] {
    const result: ImportApartmentPromotion[] = [];
    const seen = new Set<string>();

    for (const flat of flats) {
      for (const promoId of flat.promos ?? []) {
        const promo = promotions.find(
          (p) => p.external_id === promoId.toString(),
        );
        if (!promo) continue;

        const key = `${flat.id}||${promo.external_id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        result.push({
          external_apartment_id: flat.id?.toString(),
          external_promotion_id: promo.external_id,
          ...base,
        });
      }
    }

    return result;
  }

  function getDecorations(flats: MacroFlat[]): ImportDecoration[] {
    return getUniqueObjects(flats, (flat) => {
      if (!flat.restoration_id) return null;

      return {
        title: flat.estate_restoration ?? "",
        external_id: flat.restoration_id.toString(),
        description:
          flat.available_restorations?.[flat.restoration_id]?.text ?? null,
        ...base,
      };
    });
  }

  return {
    getCities,
    getTags,
    getPromos,
    getProjects,
    getBuildings,
    getSections,
    getEntrances,
    getFloors,
    getApartmentLayouts,
    getApartments,
    getCommercial,
    getNonResidentialFloors,
    getNonResidentialRealty,
    getApartmentLayoutTags,
    getApartmentPromotions,
    getDecorations,
  };
}
