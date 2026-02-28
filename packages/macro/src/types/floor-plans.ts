export interface FloorPlan {
  file_url: string;
  file_ext: string;
  floor: string;
  entrance: string;
}

export type FloorPlans = Record<string, FloorPlan[]>;
