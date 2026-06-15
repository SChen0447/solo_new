import { create } from 'zustand';
import { GrowthParams, GrowthStage, LogEntry, PartInfo, STAGE_ORDER, STAGE_DURATIONS } from './types';

interface GrowthState {
  params: GrowthParams;
  currentStage: GrowthStage;
  stageProgress: number;
  logs: LogEntry[];
  partInfo: PartInfo;
  growthTriggered: boolean;
  updateParam: (key: keyof GrowthParams, value: number) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateStageProgress: (delta: number) => void;
  setPartInfo: (info: PartInfo) => void;
  setGrowthTriggered: (v: boolean) => void;
}

let logIdCounter = 0;

export const useGrowthStore = create<GrowthState>((set, get) => ({
  params: {
    light: 60,
    water: 60,
    co2: 1.0,
  },
  currentStage: GrowthStage.SEED,
  stageProgress: 0,
  logs: [],
  partInfo: { visible: false, x: 0, y: 0, name: '', details: '' },
  growthTriggered: false,

  updateParam: (key, value) => {
    const state = get();
    const oldValue = state.params[key];
    if (Math.abs(oldValue - value) < 0.01) return;

    const labels: Record<keyof GrowthParams, string> = {
      light: '光照',
      water: '水分',
      co2: '二氧化碳',
    };
    const units: Record<keyof GrowthParams, string> = {
      light: '%',
      water: '%',
      co2: 'ppm',
    };

    const leafDensityChange = Math.round(((value - oldValue) / (key === 'co2' ? 1.5 : 100)) * 100);
    const direction = leafDensityChange >= 0 ? '增加' : '减少';
    const message = `${labels[key]}从${oldValue.toFixed(key === 'co2' ? 1 : 0)}${units[key]}→${value.toFixed(key === 'co2' ? 1 : 0)}${units[key]}，叶片密度${direction}${Math.abs(leafDensityChange)}%`;

    set((s) => ({
      params: { ...s.params, [key]: value },
      growthTriggered: true,
    }));

    get().addLog({
      message,
      paramKey: key,
      oldValue,
      newValue: value,
    });

    setTimeout(() => {
      set({ growthTriggered: false });
    }, 3000);
  },

  addLog: (entry) => {
    const newLog: LogEntry = {
      ...entry,
      id: logIdCounter++,
      timestamp: Date.now(),
    };
    set((s) => ({
      logs: [newLog, ...s.logs].slice(0, 5),
    }));
  },

  updateStageProgress: (delta) => {
    const state = get();
    const currentDuration = STAGE_DURATIONS[state.currentStage];
    let newProgress = state.stageProgress + delta;
    let newStage = state.currentStage;

    while (newProgress >= 1) {
      const currentIdx = STAGE_ORDER.indexOf(newStage);
      if (currentIdx < STAGE_ORDER.length - 1) {
        newStage = STAGE_ORDER[currentIdx + 1];
        newProgress -= 1;
      } else {
        newProgress = 1;
        break;
      }
    }

    set({ stageProgress: newProgress, currentStage: newStage });
  },

  setPartInfo: (info) => set({ partInfo: info }),
  setGrowthTriggered: (v) => set({ growthTriggered: v }),
}));
