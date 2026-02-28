export type { MacroFlat, MacroImage, MacroImageFolder } from "./flat";
export type { MacroPromo } from "./promo";
export type { FloorPlan, FloorPlans, FloorSchemes } from "./floor-plans";

export type MacroHouse = {
  id: number;
  name: string;
};

export type MacroComplex = {
  id: number;
  name: string;
  houses: MacroHouse[];
};
export type {
  ImportData,
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
  ApartmentStatus,
} from "./import-data";
