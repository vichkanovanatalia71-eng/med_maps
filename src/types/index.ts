export interface LegalEntity {
  id: string;
  name: string;
  edrpou: string;
  type: string;
  address: string;
  oblast: string;
  city: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "CLOSED";
}

export interface ExecutorService {
  code: string;
  name: string;
  completed: number;
}

export interface ExecutorData {
  id: string;
  completed: number;
  by_category: Record<string, number>;
  by_specialty: Record<string, number>;
  by_period: Record<string, number>;
  by_age_group: Record<string, number>;
  by_gender: Record<string, number>;
  by_priority: Record<string, number>;
  services: ExecutorService[];
}

export interface EnrichedFacility {
  id: string;
  name: string;
  edrpou: string;
  type: string;
  address: string;
  oblast: string;
  city: string;
  latitude: number;
  longitude: number;
  totalCompleted: number;
  categories: Record<string, number>;
  specialities: Record<string, number>;
  ageGroups: Record<string, number>;
  genderDistribution: Record<string, number>;
  priorities: Record<string, number>;
  monthlyData: Record<string, number>;
  services: ExecutorService[];
}

export interface Filters {
  specialities: string[];
  categories: string[];
  services: string[];
  priority: string;
  ageGroups: string[];
  gender: string;
  periodFrom: string;
  periodTo: string;
}

export interface OblastData {
  name: string;
  totalCompleted: number;
  facilitiesCount: number;
}

export type MapMode = "markers" | "heatmap";
