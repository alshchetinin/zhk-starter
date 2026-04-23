import type { ImportData } from "../types";
import {
  getMacroRealty,
  getMacroFloorPlans,
  getMacroFloorSchemes,
  getMacroPromos,
} from "../api";
import { createMacroServices } from "../services";

export interface MacroIntegrationConfig {
  id: string;
  siteId: string;
  domain: string;
  appSecret: string;
  apiDomain: string;
}

export async function getMacroData(
  integration: MacroIntegrationConfig,
  complexes: number[],
): Promise<ImportData> {
  const { id: integrationId, siteId, domain, appSecret, apiDomain } =
    integration;

  const services = createMacroServices({ integrationId, siteId });

  const floorPlans = await getMacroFloorPlans(
    integrationId,
    domain,
    appSecret,
    apiDomain,
  );

  const floorSchemes = await getMacroFloorSchemes(floorPlans);

  console.log(
    `[macro:${integrationId}] Floor schemes: ${floorSchemes.length} SVG files downloaded`,
  );

  const livingRealty = await getMacroRealty(
    integrationId,
    "living",
    domain,
    appSecret,
    apiDomain,
    complexes,
  );

  const promos = await getMacroPromos(domain, appSecret, apiDomain);

  const flats = livingRealty.filter((flat) => flat.category === "flat");
  const parkingRealty = livingRealty.filter(
    (flat) => flat.category === "garage",
  );
  const storageRealty = livingRealty.filter(
    (flat) => flat.category === "storageroom",
  );

  const commercialRealty = await getMacroRealty(
    integrationId,
    "comm",
    domain,
    appSecret,
    apiDomain,
    complexes,
  );

  const allRealty = [...flats, ...commercialRealty];
  const allNonResidentialRealty = [
    ...parkingRealty,
    ...storageRealty,
    ...commercialRealty,
  ];

  const cities = services.getCities(allRealty);
  const tags = services.getTags(flats);
  const promotions = services.getPromos(promos);
  const projects = services.getProjects(allRealty);
  const buildings = services.getBuildings(allRealty);
  const sections = services.getSections(flats);
  const entrances = services.getEntrances(flats);
  const floors = services.getFloors(flats, floorPlans, floorSchemes);
  const apartment_layouts = services.getApartmentLayouts(flats);
  const apartment_layout_tags = services.getApartmentLayoutTags(
    flats,
    apartment_layouts,
    tags,
  );
  const apartments = services.getApartments(flats);
  const non_residential_floors = services.getNonResidentialFloors(
    allNonResidentialRealty,
    floorPlans,
    floorSchemes,
  );
  const commerce = services.getCommercial(commercialRealty);
  const parking = services.getNonResidentialRealty(parkingRealty);
  const storage = services.getNonResidentialRealty(storageRealty);
  const apartment_promotions = services.getApartmentPromotions(
    flats,
    promotions,
  );
  const decorations = services.getDecorations(flats);

  console.log(
    `[macro:${integrationId}] Data transformed:`,
    `cities=${cities.length}`,
    `projects=${projects.length}`,
    `buildings=${buildings.length}`,
    `sections=${sections.length}`,
    `floors=${floors.length}`,
    `layouts=${apartment_layouts.length}`,
    `apartments=${apartments.length}`,
    `commerce=${commerce.length}`,
    `parking=${parking.length}`,
    `storage=${storage.length}`,
  );

  return {
    cities,
    tags,
    promotions,
    projects,
    buildings,
    sections,
    entrances,
    floors,
    apartment_layouts,
    apartment_layout_tags,
    apartments,
    commerce,
    non_residential_floors,
    parking,
    storage,
    apartment_promotions,
    decorations,
  };
}
