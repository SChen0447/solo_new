import { create } from 'zustand';
import { Specimen, Symbiosis, FilterState, ViewMode, GraphMode, ForceParams, Category } from '@/types';

interface StoreState {
  specimens: Specimen[];
  relations: Symbiosis[];
  selectedSpecimen: Specimen | null;
  filter: FilterState;
  viewMode: ViewMode;
  graphMode: GraphMode;
  forceParams: ForceParams;
  isTransitioning: boolean;
  filteredSpecimens: Specimen[];
  highlightedNodes: string[];
  setSpecimens: (specimens: Specimen[]) => void;
  setRelations: (relations: Symbiosis[]) => void;
  setSelectedSpecimen: (specimen: Specimen | null) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  toggleCategory: (category: Category) => void;
  toggleOrigin: (origin: string) => void;
  setHardnessRange: (range: [number, number]) => void;
  setViewMode: (mode: ViewMode) => void;
  setGraphMode: (mode: GraphMode) => void;
  setForceParams: (params: Partial<ForceParams>) => void;
  setIsTransitioning: (value: boolean) => void;
  setHighlightedNodes: (nodeIds: string[]) => void;
  clearFilter: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  specimens: [],
  relations: [],
  selectedSpecimen: null,
  filter: {
    categories: [],
    origins: [],
    hardnessRange: [1, 10],
  },
  viewMode: 'specimen',
  graphMode: 'top',
  forceParams: {
    repulsion: 100,
    attraction: 50,
  },
  isTransitioning: false,
  highlightedNodes: [],

  get filteredSpecimens() {
    const { specimens, filter } = get();
    return specimens.filter((s) => {
      const categoryMatch = filter.categories.length === 0 || filter.categories.includes(s.category);
      const originMatch = filter.origins.length === 0 || filter.origins.includes(s.origin);
      const hardnessMatch = s.hardness[0] >= filter.hardnessRange[0] && s.hardness[1] <= filter.hardnessRange[1];
      return categoryMatch && originMatch && hardnessMatch;
    });
  },

  setSpecimens: (specimens) => set({ specimens }),
  setRelations: (relations) => set({ relations }),
  setSelectedSpecimen: (specimen) => set({ selectedSpecimen: specimen }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  toggleCategory: (category) =>
    set((state) => {
      const categories = state.filter.categories.includes(category)
        ? state.filter.categories.filter((c) => c !== category)
        : [...state.filter.categories, category];
      return { filter: { ...state.filter, categories } };
    }),

  toggleOrigin: (origin) =>
    set((state) => {
      const origins = state.filter.origins.includes(origin)
        ? state.filter.origins.filter((o) => o !== origin)
        : [...state.filter.origins, origin];
      return { filter: { ...state.filter, origins } };
    }),

  setHardnessRange: (range) =>
    set((state) => ({
      filter: { ...state.filter, hardnessRange: range },
    })),

  setViewMode: (viewMode) => set({ viewMode, isTransitioning: true }),
  setGraphMode: (graphMode) => set({ graphMode }),
  setForceParams: (params) =>
    set((state) => ({
      forceParams: { ...state.forceParams, ...params },
