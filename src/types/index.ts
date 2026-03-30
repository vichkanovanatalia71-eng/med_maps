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

export interface ServiceRequest {
  period_created_at: string;
  requester_legal_entity_id: string;
  requester_employee_speciality: string;
  service_request_category: string;
  service_request_priority: string;
  service_code: string;
  service_code_name: string;
  patient_age_group: string;
  patient_gender: string;
  used_by_legal_entity_identifier_value: string | null;
  count_created_requests_all: number;
  count_is_completed: number;
  count_is_recalled: number;
  count_is_entered_in_error: number;
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
  totalCreated: number;
  totalRecalled: number;
  totalError: number;
  categories: Record<string, number>;
  specialities: Record<string, number>;
  ageGroups: Record<string, number>;
  genderDistribution: Record<string, number>;
  monthlyData: Record<string, number>;
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
  statuses: string[];
}

export interface OblastData {
  name: string;
  totalCompleted: number;
  totalCreated: number;
  facilitiesCount: number;
}

export type MapMode = "markers" | "heatmap";
