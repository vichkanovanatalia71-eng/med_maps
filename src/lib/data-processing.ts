import { ExecutorData, LegalEntity, EnrichedFacility, Filters, OblastData } from "@/types";

export function enrichFacilities(
  executors: ExecutorData[],
  legalEntities: LegalEntity[],
  filters: Filters
): EnrichedFacility[] {
  const entityMap = new Map<string, LegalEntity>();
  for (const entity of legalEntities) {
    entityMap.set(entity.id, entity);
  }

  const enriched: EnrichedFacility[] = [];

  for (const exec of executors) {
    const entity = entityMap.get(exec.id);
    if (!entity || !entity.latitude || !entity.longitude) continue;

    // Apply filters — each filter reduces the effective count
    // Since the data is pre-aggregated, we filter by checking if the executor
    // has data in the requested dimensions

    // Category filter
    if (filters.categories.length > 0) {
      const hasCategory = filters.categories.some(c => (exec.by_category[c] || 0) > 0);
      if (!hasCategory) continue;
    }

    // Specialty filter
    if (filters.specialities.length > 0) {
      const hasSpecialty = filters.specialities.some(s => (exec.by_specialty[s] || 0) > 0);
      if (!hasSpecialty) continue;
    }

    // Service filter
    if (filters.services.length > 0) {
      const hasService = filters.services.some(svc =>
        exec.services.some(s => s.code === svc && s.completed > 0)
      );
      if (!hasService) continue;
    }

    // Priority filter
    if (filters.priority !== "Всі") {
      if ((exec.by_priority[filters.priority] || 0) === 0) continue;
    }

    // Age group filter
    if (filters.ageGroups.length > 0) {
      const hasAge = filters.ageGroups.some(a => (exec.by_age_group[a] || 0) > 0);
      if (!hasAge) continue;
    }

    // Gender filter
    if (filters.gender !== "Всі") {
      if ((exec.by_gender[filters.gender] || 0) === 0) continue;
    }

    // Period filter
    if (filters.periodFrom || filters.periodTo) {
      const hasPeriod = Object.keys(exec.by_period).some(p => {
        if (filters.periodFrom && p < filters.periodFrom) return false;
        if (filters.periodTo && p > filters.periodTo) return false;
        return true;
      });
      if (!hasPeriod) continue;
    }

    // Compute filtered completed count
    let filteredCompleted = exec.completed;

    // If category filter is active, sum only matching categories
    if (filters.categories.length > 0) {
      filteredCompleted = filters.categories.reduce((sum, c) => sum + (exec.by_category[c] || 0), 0);
    }

    // If period filter is active, sum only matching periods
    if (filters.periodFrom || filters.periodTo) {
      const periodTotal = Object.entries(exec.by_period)
        .filter(([p]) => {
          if (filters.periodFrom && p < filters.periodFrom) return false;
          if (filters.periodTo && p > filters.periodTo) return false;
          return true;
        })
        .reduce((sum, [, count]) => sum + count, 0);
      // Use period total as a better estimate when period filter is active
      filteredCompleted = Math.min(filteredCompleted, periodTotal);
    }

    // Filter services list
    let filteredServices = exec.services;
    if (filters.categories.length > 0 || filters.services.length > 0) {
      filteredServices = exec.services.filter(s => {
        if (filters.services.length > 0) return filters.services.includes(s.code);
        return true;
      });
    }

    enriched.push({
      id: exec.id,
      name: entity.name,
      edrpou: entity.edrpou,
      type: entity.type,
      address: entity.address,
      oblast: entity.oblast,
      city: entity.city,
      latitude: entity.latitude,
      longitude: entity.longitude,
      totalCompleted: filteredCompleted,
      categories: exec.by_category,
      specialities: exec.by_specialty,
      ageGroups: exec.by_age_group,
      genderDistribution: exec.by_gender,
      priorities: exec.by_priority,
      monthlyData: exec.by_period,
      services: filteredServices,
    });
  }

  return enriched;
}

export function aggregateByOblast(facilities: EnrichedFacility[]): Record<string, OblastData> {
  const result: Record<string, OblastData> = {};

  for (const facility of facilities) {
    if (!result[facility.oblast]) {
      result[facility.oblast] = {
        name: facility.oblast,
        totalCompleted: 0,
        facilitiesCount: 0,
      };
    }
    result[facility.oblast].totalCompleted += facility.totalCompleted;
    result[facility.oblast].facilitiesCount += 1;
  }

  return result;
}

export function getAggregateStats(facilities: EnrichedFacility[]) {
  let totalCompleted = 0;
  const categoryCounts: Record<string, number> = {};
  const specialityCounts: Record<string, number> = {};
  const ageGroupCounts: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};
  const monthlyCounts: Record<string, number> = {};
  const serviceCounts: Record<string, { name: string; completed: number }> = {};

  for (const f of facilities) {
    totalCompleted += f.totalCompleted;

    for (const [cat, count] of Object.entries(f.categories)) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
    }
    for (const [spec, count] of Object.entries(f.specialities)) {
      specialityCounts[spec] = (specialityCounts[spec] || 0) + count;
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
    for (const svc of f.services) {
      if (!serviceCounts[svc.code]) {
        serviceCounts[svc.code] = { name: svc.name, completed: 0 };
      }
      serviceCounts[svc.code].completed += svc.completed;
    }
  }

  const top10 = [...facilities]
    .sort((a, b) => b.totalCompleted - a.totalCompleted)
    .slice(0, 10);

  const topServices = Object.entries(serviceCounts)
    .map(([code, data]) => ({ code, name: data.name, completed: data.completed }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 15);

  return {
    totalCompleted,
    categoryCounts,
    specialityCounts,
    ageGroupCounts,
    genderCounts,
    monthlyCounts,
    top10,
    topServices,
  };
}

export function getAvailableServices(executors: ExecutorData[], selectedCategories: string[]) {
  const serviceMap = new Map<string, { code: string; name: string; total: number }>();

  for (const exec of executors) {
    // If category filter is on, only include services from executors that have those categories
    if (selectedCategories.length > 0) {
      const hasCategory = selectedCategories.some(c => (exec.by_category[c] || 0) > 0);
      if (!hasCategory) continue;
    }

    for (const svc of exec.services) {
      const existing = serviceMap.get(svc.code);
      if (existing) {
        existing.total += svc.completed;
      } else {
        serviceMap.set(svc.code, { code: svc.code, name: svc.name, total: svc.completed });
      }
    }
  }

  return Array.from(serviceMap.values())
    .sort((a, b) => b.total - a.total)
    .map(s => ({ code: s.code, name: `${s.name} (${s.total.toLocaleString("uk-UA")})` }));
}

export function getUniqueSpecialities(executors: ExecutorData[]): string[] {
  const specs = new Set<string>();
  for (const exec of executors) {
    for (const key of Object.keys(exec.by_specialty)) {
      specs.add(key);
    }
  }
  return Array.from(specs).sort((a, b) => a.localeCompare(b, "uk"));
}

export function getUniqueCategories(executors: ExecutorData[]): string[] {
  const cats = new Set<string>();
  for (const exec of executors) {
    for (const key of Object.keys(exec.by_category)) {
      cats.add(key);
    }
  }
  return Array.from(cats).sort((a, b) => a.localeCompare(b, "uk"));
}

export function getUniquePeriods(executors: ExecutorData[]): string[] {
  const periods = new Set<string>();
  for (const exec of executors) {
    for (const key of Object.keys(exec.by_period)) {
      periods.add(key);
    }
  }
  return Array.from(periods).sort();
}
