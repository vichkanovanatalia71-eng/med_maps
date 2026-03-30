import { ServiceRequest, LegalEntity, EnrichedFacility, Filters, OblastData } from "@/types";

export function enrichFacilities(
  serviceRequests: ServiceRequest[],
  legalEntities: LegalEntity[],
  filters: Filters
): EnrichedFacility[] {
  const entityMap = new Map<string, LegalEntity>();
  for (const entity of legalEntities) {
    entityMap.set(entity.id, entity);
  }

  const filtered = applyFilters(serviceRequests, filters);

  // Only requests that have been fulfilled (have executor)
  const withExecutor = filtered.filter(sr => sr.used_by_legal_entity_identifier_value);

  const facilityMap = new Map<string, {
    totalCompleted: number;
    totalCreated: number;
    totalRecalled: number;
    totalError: number;
    categories: Record<string, number>;
    specialities: Record<string, number>;
    ageGroups: Record<string, number>;
    genderDistribution: Record<string, number>;
    monthlyData: Record<string, number>;
  }>();

  for (const sr of withExecutor) {
    const facilityId = sr.used_by_legal_entity_identifier_value!;
    let data = facilityMap.get(facilityId);
    if (!data) {
      data = {
        totalCompleted: 0,
        totalCreated: 0,
        totalRecalled: 0,
        totalError: 0,
        categories: {},
        specialities: {},
        ageGroups: {},
        genderDistribution: {},
        monthlyData: {},
      };
      facilityMap.set(facilityId, data);
    }

    data.totalCompleted += sr.count_is_completed;
    data.totalCreated += sr.count_created_requests_all;
    data.totalRecalled += sr.count_is_recalled;
    data.totalError += sr.count_is_entered_in_error;
    data.categories[sr.service_request_category] = (data.categories[sr.service_request_category] || 0) + sr.count_is_completed;
    data.specialities[sr.requester_employee_speciality] = (data.specialities[sr.requester_employee_speciality] || 0) + sr.count_is_completed;
    data.ageGroups[sr.patient_age_group] = (data.ageGroups[sr.patient_age_group] || 0) + sr.count_is_completed;
    data.genderDistribution[sr.patient_gender] = (data.genderDistribution[sr.patient_gender] || 0) + sr.count_is_completed;
    data.monthlyData[sr.period_created_at] = (data.monthlyData[sr.period_created_at] || 0) + sr.count_is_completed;
  }

  const enriched: EnrichedFacility[] = [];
  for (const [id, data] of facilityMap) {
    const entity = entityMap.get(id);
    if (!entity || !entity.latitude || !entity.longitude) continue;

    enriched.push({
      id,
      name: entity.name,
      edrpou: entity.edrpou,
      type: entity.type,
      address: entity.address,
      oblast: entity.oblast,
      city: entity.city,
      latitude: entity.latitude,
      longitude: entity.longitude,
      ...data,
    });
  }

  return enriched;
}

export function applyFilters(serviceRequests: ServiceRequest[], filters: Filters): ServiceRequest[] {
  return serviceRequests.filter(sr => {
    if (filters.specialities.length > 0 && !filters.specialities.includes(sr.requester_employee_speciality)) {
      return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(sr.service_request_category)) {
      return false;
    }
    if (filters.services.length > 0 && !filters.services.includes(sr.service_code)) {
      return false;
    }
    if (filters.priority !== "Всі" && sr.service_request_priority !== filters.priority) {
      return false;
    }
    if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(sr.patient_age_group)) {
      return false;
    }
    if (filters.gender !== "Всі" && sr.patient_gender !== filters.gender) {
      return false;
    }
    if (filters.periodFrom && sr.period_created_at < filters.periodFrom) {
      return false;
    }
    if (filters.periodTo && sr.period_created_at > filters.periodTo) {
      return false;
    }
    if (filters.statuses.length > 0) {
      const hasCompleted = sr.count_is_completed > 0;
      const hasRecalled = sr.count_is_recalled > 0;
      const hasError = sr.count_is_entered_in_error > 0;
      const hasUnfulfilled = sr.count_created_requests_all > (sr.count_is_completed + sr.count_is_recalled + sr.count_is_entered_in_error);

      const matchesAny = filters.statuses.some(status => {
        if (status === "Виконані" && hasCompleted) return true;
        if (status === "Відкликані" && hasRecalled) return true;
        if (status === "Помилкові" && hasError) return true;
        if (status === "Невиконані" && hasUnfulfilled) return true;
        return false;
      });
      if (!matchesAny) return false;
    }
    return true;
  });
}

export function aggregateByOblast(facilities: EnrichedFacility[]): Record<string, OblastData> {
  const result: Record<string, OblastData> = {};

  for (const facility of facilities) {
    if (!result[facility.oblast]) {
      result[facility.oblast] = {
        name: facility.oblast,
        totalCompleted: 0,
        totalCreated: 0,
        facilitiesCount: 0,
      };
    }
    result[facility.oblast].totalCompleted += facility.totalCompleted;
    result[facility.oblast].totalCreated += facility.totalCreated;
    result[facility.oblast].facilitiesCount += 1;
  }

  return result;
}

export function getAggregateStats(facilities: EnrichedFacility[]) {
  let totalCompleted = 0;
  let totalCreated = 0;
  const categoryCounts: Record<string, number> = {};
  const ageGroupCounts: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};
  const monthlyCounts: Record<string, number> = {};

  for (const f of facilities) {
    totalCompleted += f.totalCompleted;
    totalCreated += f.totalCreated;

    for (const [cat, count] of Object.entries(f.categories)) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
    }
    for (const [age, count] of Object.entries(f.ageGroups)) {
      ageGroupCounts[age] = (ageGroupCounts[age] || 0) + count;
    }
    for (const [gender, count] of Object.entries(f.genderDistribution)) {
      genderCounts[gender] = (genderCounts[gender] || 0) + count;
    }
    for (const [month, count] of Object.entries(f.monthlyData)) {
      monthlyCounts[month] = (monthlyCounts[month] || 0) + count;
    }
  }

  const top10 = [...facilities]
    .sort((a, b) => b.totalCompleted - a.totalCompleted)
    .slice(0, 10);

  return {
    totalCompleted,
    totalCreated,
    categoryCounts,
    ageGroupCounts,
    genderCounts,
    monthlyCounts,
    top10,
  };
}

export function getAvailableServices(serviceRequests: ServiceRequest[], selectedCategories: string[]) {
  const services = new Set<string>();
  const serviceNames = new Map<string, string>();

  for (const sr of serviceRequests) {
    if (selectedCategories.length === 0 || selectedCategories.includes(sr.service_request_category)) {
      services.add(sr.service_code);
      serviceNames.set(sr.service_code, sr.service_code_name);
    }
  }

  return Array.from(services).map(code => ({
    code,
    name: serviceNames.get(code) || code,
  })).sort((a, b) => a.name.localeCompare(b.name, "uk"));
}

export function getFilterCounts(serviceRequests: ServiceRequest[]) {
  const specialityCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const sr of serviceRequests) {
    specialityCounts[sr.requester_employee_speciality] = (specialityCounts[sr.requester_employee_speciality] || 0) + 1;
    categoryCounts[sr.service_request_category] = (categoryCounts[sr.service_request_category] || 0) + 1;
  }

  return { specialityCounts, categoryCounts };
}
