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
    // Load both data sources in parallel
    const [csvResponse, executorsResponse] = await Promise.all([
      fetch("/pmg_contracts_package_addresses.csv"),
      fetch("/executors.json"),
    ]);

    const [csvText, executorsData] = await Promise.all([
      csvResponse.text(),
      executorsResponse.json() as Promise<ExecutorData[]>,
    ]);

    const legalEntities = parseRealFacilities(csvText);
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
