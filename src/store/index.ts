import { create } from "zustand";
import { Filters, MapMode, EnrichedFacility, LegalEntity, ServiceRequest } from "@/types";
import { enrichFacilities, getAggregateStats, aggregateByOblast, getAvailableServices } from "@/lib/data-processing";
import { generateMockData, PERIODS } from "@/data/mock-data";

interface AppState {
  // Raw data
  legalEntities: LegalEntity[];
  serviceRequests: ServiceRequest[];

  // Derived data
  facilities: EnrichedFacility[];
  stats: ReturnType<typeof getAggregateStats> | null;
  oblastData: Record<string, { name: string; totalCompleted: number; totalCreated: number; facilitiesCount: number }>;
  availableServices: { code: string; name: string }[];

  // UI State
  mapMode: MapMode;
  sidebarOpen: boolean;
  filters: Filters;
  isLoaded: boolean;

  // Actions
  initialize: () => void;
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
  periodFrom: PERIODS[0],
  periodTo: PERIODS[PERIODS.length - 1],
  statuses: [],
};

function recompute(state: { serviceRequests: ServiceRequest[]; legalEntities: LegalEntity[]; filters: Filters }) {
  const facilities = enrichFacilities(state.serviceRequests, state.legalEntities, state.filters);
  const stats = getAggregateStats(facilities);
  const oblastData = aggregateByOblast(facilities);
  const availableServices = getAvailableServices(state.serviceRequests, state.filters.categories);
  return { facilities, stats, oblastData, availableServices };
}

export const useStore = create<AppState>((set, get) => ({
  legalEntities: [],
  serviceRequests: [],
  facilities: [],
  stats: null,
  oblastData: {},
  availableServices: [],
  mapMode: "markers",
  sidebarOpen: true,
  filters: { ...defaultFilters },
  isLoaded: false,

  initialize: () => {
    const { legalEntities, serviceRequests } = generateMockData();
    const computed = recompute({ serviceRequests, legalEntities, filters: defaultFilters });
    set({
      legalEntities,
      serviceRequests,
      ...computed,
      isLoaded: true,
    });
  },

  setMapMode: (mode) => set({ mapMode: mode }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  setFilter: (key, value) => {
    const state = get();
    const newFilters = { ...state.filters, [key]: value };
    // If categories changed, reset services filter
    if (key === "categories") {
      newFilters.services = [];
    }
    const computed = recompute({
      serviceRequests: state.serviceRequests,
      legalEntities: state.legalEntities,
      filters: newFilters,
    });
    set({ filters: newFilters, ...computed });
  },

  resetFilters: () => {
    const state = get();
    const computed = recompute({
      serviceRequests: state.serviceRequests,
      legalEntities: state.legalEntities,
      filters: defaultFilters,
    });
    set({ filters: { ...defaultFilters }, ...computed });
  },
}));
