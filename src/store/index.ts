import { create } from "zustand";
import { Filters, MapMode, EnrichedFacility, LegalEntity, ExecutorData } from "@/types";
import {
  enrichFacilities, getAggregateStats, aggregateByOblast,
  getAvailableServices, getUniqueSpecialities, getUniqueCategories, getUniquePeriods,
} from "@/lib/data-processing";
import { parseRealFacilities } from "@/data/parse-facilities";

interface AppState {
  legalEntities: LegalEntity[];
  executors: ExecutorData[];
  facilities: EnrichedFacility[];
  stats: ReturnType<typeof getAggregateStats> | null;
  oblastData: Record<string, { name: string; totalCompleted: number; facilitiesCount: number }>;
  availableServices: { code: string; name: string }[];
  allSpecialities: string[];
  allCategories: string[];
  allPeriods: string[];

  mapMode: MapMode;
  sidebarOpen: boolean;
  filters: Filters;
  isLoaded: boolean;

  initialize: () => Promise<void>;
  setMapMode: (mode: MapMode) => void;
  toggleSidebar: () => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: Filters = {
  specialities: [],
  categories: [],
  services: [],
  priority: "Всі",
  ageGroups: [],
  gender: "Всі",
  periodFrom: "",
  periodTo: "",
};

function recompute(state: {
  executors: ExecutorData[];
  legalEntities: LegalEntity[];
  filters: Filters;
}) {
  const facilities = enrichFacilities(state.executors, state.legalEntities, state.filters);
  const stats = getAggregateStats(facilities);
  const oblastData = aggregateByOblast(facilities);
  const availableServices = getAvailableServices(state.executors, state.filters.categories);
  return { facilities, stats, oblastData, availableServices };
}

export const useStore = create<AppState>((set, get) => ({
  legalEntities: [],
  executors: [],
  facilities: [],
  stats: null,
  oblastData: {},
  availableServices: [],
  allSpecialities: [],
  allCategories: [],
  allPeriods: [],
  mapMode: "markers",
  sidebarOpen: true,
  filters: { ...defaultFilters },
  isLoaded: false,

  initialize: async () => {
    // Load all data sources in parallel
    const [entityResponse, divisionsResponse, executorsResponse] = await Promise.all([
      fetch("/pmg-legal-entity-info.csv"),
      fetch("/pmg-legal-entity-divisions-info.csv"),
      fetch("/executors.json"),
    ]);

    const [entityCsv, divisionsCsv, executorsData] = await Promise.all([
      entityResponse.text(),
      divisionsResponse.text(),
      executorsResponse.json() as Promise<ExecutorData[]>,
    ]);

    const executorIds = executorsData.map(e => e.id);
    const legalEntities = parseRealFacilities(entityCsv, divisionsCsv, executorIds);
    const allSpecialities = getUniqueSpecialities(executorsData);
    const allCategories = getUniqueCategories(executorsData);
    const allPeriods = getUniquePeriods(executorsData);

    const filters = {
      ...defaultFilters,
      periodFrom: allPeriods[0] || "",
      periodTo: allPeriods[allPeriods.length - 1] || "",
    };

    const computed = recompute({
      executors: executorsData,
      legalEntities,
      filters,
    });

    set({
      legalEntities,
      executors: executorsData,
      allSpecialities,
      allCategories,
      allPeriods,
      filters,
      ...computed,
      isLoaded: true,
    });
  },

  setMapMode: (mode) => set({ mapMode: mode }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  setFilter: (key, value) => {
    const state = get();
    const newFilters = { ...state.filters, [key]: value };
    if (key === "categories") {
      newFilters.services = [];
    }
    const computed = recompute({
      executors: state.executors,
      legalEntities: state.legalEntities,
      filters: newFilters,
    });
    set({ filters: newFilters, ...computed });
  },

  resetFilters: () => {
    const state = get();
    const filters = {
      ...defaultFilters,
      periodFrom: state.allPeriods[0] || "",
      periodTo: state.allPeriods[state.allPeriods.length - 1] || "",
    };
    const computed = recompute({
      executors: state.executors,
      legalEntities: state.legalEntities,
      filters,
    });
    set({ filters, ...computed });
  },
}));
