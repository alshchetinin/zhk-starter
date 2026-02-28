export type ApartmentStatus =
  | "free"
  | "paid_reservation"
  | "corporate_reservation"
  | "sold";

export interface ImportCity {
  external_id: string;
  name: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportTag {
  name: string;
  external_id?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportProject {
  external_id: string;
  name: string;
  address: string;
  status: string;
  coordinates?: string;
  external_city_id?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportBuilding {
  external_id: string;
  name: string;
  external_project_id: string;
  completion_date?: Date | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportSection {
  external_id: string;
  external_building_id: string;
  floors_count: number;
  name: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportEntrance {
  external_id: string;
  external_building_id: string;
  external_section_id: string;
  name: string;
  floors_count: number;
  integration_id: string;
  tenant_id: string;
}

export interface ImportFloor {
  external_id: string;
  external_section_id?: string;
  external_entrance_id?: string;
  floor_number: number;
  svg_scheme?: string | null;
  floor_image?: string | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportApartmentLayout {
  id?: string;
  external_id: string;
  name: string;
  area: number;
  floor_range: string;
  price_range: string;
  rooms_count: number;
  ceiling_height?: number;
  default_layout_image?: string | null;
  three_d_layout_image?: string | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportApartmentLayoutTag {
  external_layout_id?: string;
  tag_name?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportApartment {
  external_id: string;
  name: string;
  apartment_number: string;
  area: number;
  price: number;
  old_price: number;
  floor_number: number;
  rooms_count: number;
  status: ApartmentStatus;
  is_published: boolean;
  is_popular: boolean;
  is_studio: boolean;
  is_apartment: boolean;
  monthly_mortgage_payment: number;
  window_view?: string | null;
  ceiling_height?: number;
  three_d_tour_url?: string | null;
  completion_date?: Date | null;
  external_project_id: string;
  external_building_id: string;
  external_section_id?: string;
  external_entrance_id?: string;
  external_floor_id?: string;
  external_apartment_layout_id?: string | null;
  external_decoration_id?: string | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportCommercial {
  external_id: string;
  name: string;
  area: number;
  price: number;
  old_price: number;
  floor_number: number;
  status: ApartmentStatus;
  is_published: boolean;
  is_popular: boolean;
  completion_date?: Date | null;
  commerce_number?: string;
  category?: string | null;
  layout_image?: string | null;
  external_project_id: string;
  external_building_id: string;
  external_floor_id?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportNonResidentialFloor {
  external_id: string;
  floor_number: number;
  svg_scheme?: string | null;
  floor_image?: string | null;
  external_project_id: string;
  external_building_id: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportNonResidentialRealty {
  external_id: string;
  name: string;
  area: number;
  price: number;
  old_price: number;
  floor_number: number;
  status: ApartmentStatus;
  is_published: boolean;
  is_popular?: boolean;
  completion_date?: Date | null;
  external_project_id: string;
  external_building_id: string;
  external_floor_id?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportPromo {
  external_id: string;
  name: string;
  description: string;
  date_start: Date | null;
  date_end: Date | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportApartmentPromotion {
  external_apartment_id?: string;
  external_promotion_id?: string;
  integration_id: string;
  tenant_id: string;
}

export interface ImportDecoration {
  external_id: string;
  title: string;
  description?: string | null;
  integration_id: string;
  tenant_id: string;
}

export interface ImportData {
  cities?: ImportCity[];
  tags?: ImportTag[];
  projects?: ImportProject[];
  buildings?: ImportBuilding[];
  sections?: ImportSection[];
  entrances?: ImportEntrance[];
  floors?: ImportFloor[];
  apartment_layouts?: ImportApartmentLayout[];
  apartment_layout_tags?: ImportApartmentLayoutTag[];
  apartments?: ImportApartment[];
  commerce?: ImportCommercial[];
  non_residential_floors?: ImportNonResidentialFloor[];
  parking?: ImportNonResidentialRealty[];
  storage?: ImportNonResidentialRealty[];
  promotions?: ImportPromo[];
  apartment_promotions?: ImportApartmentPromotion[];
  decorations?: ImportDecoration[];
}
