import { create } from 'zustand';

export type ChartType = 'scatter' | 'line' | 'bar';

export interface AxisMapping {
  x: string | null;
  y: string | null;
  color: string | null;
  size: string | null;
}

export interface DetailCardData {
  row: Record<string, string | number>;
  x: number;
  y: number;
}

interface DataStore {
  fields: string[];
  rows: Record<string, string | number>[];
  chartType: ChartType;
  axisMapping: AxisMapping;
  notification: { type: 'success' | 'error'; message: string } | null;
  detailCard: DetailCardData | null;
  drawerOpen: boolean;

  setParsedData: (fields: string[], rows: Record<string, string | number>[]) => void;
  setChartType: (type: ChartType) => void;
  updateAxisMapping: (axis: keyof AxisMapping, field: string | null) => void;
  clearAxisMapping: (axis: keyof AxisMapping) => void;
  clearAllAxisMappings: () => void;
  setNotification: (notification: { type: 'success' | 'error'; message: string } | null) => void;
  setDetailCard: (data: DetailCardData | null) => void;
  setDrawerOpen: (open: boolean) => void;

  getAvailableFields: () => string[];
}

export const useStore = create<DataStore>((set, get) => ({
  fields: [],
  rows: [],
  chartType: 'scatter',
  axisMapping: { x: null, y: null, color: null, size: null },
  notification: null,
  detailCard: null,
  drawerOpen: false,

  setParsedData: (fields, rows) =>
    set({
      fields,
      rows,
      axisMapping: { x: null, y: null, color: null, size: null },
      detailCard: null,
    }),

  setChartType: (type) => set({ chartType: type, detailCard: null }),

  updateAxisMapping: (axis, field) =>
    set((state) => {
      const newMapping = { ...state.axisMapping };
      if (field !== null) {
        (Object.keys(newMapping) as (keyof AxisMapping)[]).forEach((key) => {
          if (newMapping[key] === field) {
            newMapping[key] = null;
          }
        });
      }
      newMapping[axis] = field;
      return { axisMapping: newMapping, detailCard: null };
    }),

  clearAxisMapping: (axis) =>
    set((state) => ({
      axisMapping: { ...state.axisMapping, [axis]: null },
      detailCard: null,
    })),

  clearAllAxisMappings: () =>
    set({ axisMapping: { x: null, y: null, color: null, size: null }, detailCard: null }),

  setNotification: (notification) => set({ notification }),

  setDetailCard: (data) => set({ detailCard: data }),

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  getAvailableFields: () => {
    const state = get();
    const mappedFields = Object.values(state.axisMapping).filter(Boolean) as string[];
    return state.fields.filter((f) => !mappedFields.includes(f));
  },
}));
