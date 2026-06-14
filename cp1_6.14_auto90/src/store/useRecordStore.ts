import { create } from 'zustand';
import type {
  RecordItem,
  Filters,
  NewRecordPayload,
  RatingPayload,
  Stats,
} from '@/shared/types';
import { RecordService } from '../modules/records/RecordService';
import { StatsService } from '../modules/stats/StatsService';

interface RecordState {
  records: RecordItem[];
  stats: Stats | null;
  filters: Filters;
  loading: boolean;
  selectedId: string | null;
  showAddModal: boolean;
  error: string | null;

  loadRecords: () => Promise<void>;
  loadStats: () => Promise<void>;
  refreshAll: () => Promise<void>;

  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  selectRecord: (id: string | null) => void;
  setShowAddModal: (v: boolean) => void;

  createRecord: (payload: NewRecordPayload) => Promise<void>;
  addRating: (id: string, payload: RatingPayload) => Promise<void>;
}

const DEFAULT_FILTERS: Filters = {
  styles: [],
  yearGte: 1950,
  yearLte: 2025,
  rating: null,
  sort: 'recent',
};

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  stats: null,
  filters: { ...DEFAULT_FILTERS },
  loading: false,
  selectedId: null,
  showAddModal: false,
  error: null,

  loadRecords: async () => {
    set({ loading: true, error: null });
    try {
      const f = get().filters;
      const list = await RecordService.list({
        style: f.styles.length ? f.styles : undefined,
        sort: f.sort,
        yearGte: f.yearGte,
        yearLte: f.yearLte,
        rating: f.rating,
      });
      set({ records: list, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await StatsService.getStats();
      set({ stats });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshAll: async () => {
    await Promise.all([get().loadRecords(), get().loadStats()]);
  },

  setFilters: (patch) => {
    const base = get().filters;
    set({ filters: { ...base, ...patch } });
    void get().loadRecords();
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    void get().loadRecords();
  },

  selectRecord: (id) => set({ selectedId: id }),

  setShowAddModal: (v) => set({ showAddModal: v }),

  createRecord: async (payload) => {
    await RecordService.create(payload);
    await get().refreshAll();
  },

  addRating: async (id, payload) => {
    await RecordService.addRating(id, payload);
    await get().refreshAll();
  },
}));

export default useRecordStore;
