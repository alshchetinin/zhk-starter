export interface FloorPlan {
  id: number;
  estate_id: number;
  entrance: string;
  floor: string;
  file_name: string;
  file_ext: string;
  file_url: string;
  date_added: string;
}

export type FloorPlans = Record<string, FloorPlan[]>;

export interface FloorSchemes {
  estate_id: number;
  entrance: string;
  floor: string;
  svg_scheme: string;
}
