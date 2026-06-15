import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Plant,
  CareEntry,
  CareType,
  EventType,
  EventBus,
  AppState
} from '../types';
import { CARE_TYPE_HEALTH_CHANGE } from '../types';

type EventCallback = (...args: any[]) => void;

class SimpleEventBus implements EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  on(event: EventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: EventType, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: EventType, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

const STORAGE_KEY = 'plant-diary-data';

const loadFromStorage = (): { plants: Plant[]; entries: CareEntry[] } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        plants: parsed.plants || [],
        entries: parsed.entries || []
      };
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  return { plants: [], entries: [] };
};

const saveToStorage = (plants: Plant[], entries: CareEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plants, entries }));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

interface PlantStore extends AppState {
  eventBus: EventBus;
  addEntry: (data: { plantName: string; type: CareType; date: string; note: string }) => void;
  updateEntry: (id: string, data: Partial<Omit<CareEntry, 'id' | 'createdAt'>>) => void;
  deleteEntry: (id: string) => void;
  selectPlant: (id: string | null) => void;
  selectEntry: (id: string | null) => void;
  setFilterDate: (date: string | null) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  getPlantEntries: (plantId: string) => CareEntry[];
  getPlantHealth: (plantId: string) => number;
  recalculateAllHealth: () => void;
}

export const eventBus = new SimpleEventBus();

export const usePlantStore = create<PlantStore>((set, get) => {
  const initial = loadFromStorage();

  return {
    plants: initial.plants,
    entries: initial.entries,
    selectedPlantId: initial.plants[0]?.id || null,
    selectedEntryId: null,
    filterDate: null,
    eventBus,

    addEntry: (data) => {
      const { plantName, type, date, note } = data;
      const state = get();

      let plant = state.plants.find((p) => p.name === plantName);
      let newPlants = state.plants;

      if (!plant) {
        plant = {
          id: uuidv4(),
          name: plantName,
          createdAt: new Date().toISOString(),
          health: 100
        };
        newPlants = [...state.plants, plant];
      }

      const entry: CareEntry = {
        id: uuidv4(),
        plantId: plant.id,
        plantName: plant.name,
        type,
        date,
        note,
        createdAt: new Date().toISOString()
      };

      const newEntries = [entry, ...state.entries];
      const healthChange = CARE_TYPE_HEALTH_CHANGE[type];
      newPlants = newPlants.map((p) =>
        p.id === plant!.id
          ? { ...p, health: Math.min(100, Math.max(0, p.health + healthChange)) }
          : p
      );

      saveToStorage(newPlants, newEntries);
      set({ plants: newPlants, entries: newEntries, selectedPlantId: plant!.id });
      eventBus.emit('entry:added', entry);
    },

    updateEntry: (id, data) => {
      const state = get();
      const entry = state.entries.find((e) => e.id === id);
      if (!entry) return;

      let newPlants = state.plants;
      const newEntries = state.entries.map((e) =>
        e.id === id ? { ...e, ...data } : e
      );

      if (data.plantName && data.plantName !== entry.plantName) {
        let targetPlant = state.plants.find((p) => p.name === data.plantName);
        if (!targetPlant) {
          targetPlant = {
            id: uuidv4(),
            name: data.plantName,
            createdAt: new Date().toISOString(),
            health: 100
          };
          newPlants = [...state.plants, targetPlant];
        }
        const updatedEntry = newEntries.find((e) => e.id === id)!;
        updatedEntry.plantId = targetPlant.id;
        updatedEntry.plantName = targetPlant.name;
      }

      if (data.type && data.type !== entry.type) {
        const oldDelta = CARE_TYPE_HEALTH_CHANGE[entry.type];
        const newDelta = CARE_TYPE_HEALTH_CHANGE[data.type];
        const diff = newDelta - oldDelta;
        const updatedEntry = newEntries.find((e) => e.id === id)!;
        newPlants = newPlants.map((p) =>
          p.id === updatedEntry.plantId
            ? { ...p, health: Math.min(100, Math.max(0, p.health + diff)) }
            : p
        );
      }

      saveToStorage(newPlants, newEntries);
      set({ plants: newPlants, entries: newEntries });
      eventBus.emit('entry:updated', { ...entry, ...data });
    },

    deleteEntry: (id) => {
      const state = get();
      const entry = state.entries.find((e) => e.id === id);
      if (!entry) return;

      const healthChange = CARE_TYPE_HEALTH_CHANGE[entry.type];
      const newPlants = state.plants.map((p) =>
        p.id === entry.plantId
          ? { ...p, health: Math.min(100, Math.max(0, p.health - healthChange)) }
          : p
      );
      const newEntries = state.entries.filter((e) => e.id !== id);

      saveToStorage(newPlants, newEntries);
      set({ plants: newPlants, entries: newEntries });
      eventBus.emit('entry:deleted', id);
    },

    selectPlant: (id) => {
      set({ selectedPlantId: id, selectedEntryId: null });
      eventBus.emit('plant:selected', id);
    },

    selectEntry: (id) => {
      set({ selectedEntryId: id });
      eventBus.emit('entry:selected', id);
    },

    setFilterDate: (date) => {
      set({ filterDate: date });
      eventBus.emit('filter:changed', date);
    },

    exportData: () => {
      const state = get();
      return JSON.stringify({
        plants: state.plants,
        entries: state.entries,
        exportedAt: new Date().toISOString()
      }, null, 2);
    },

    importData: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (!parsed.plants || !parsed.entries) return false;

        saveToStorage(parsed.plants, parsed.entries);
        set({
          plants: parsed.plants,
          entries: parsed.entries,
          selectedPlantId: parsed.plants[0]?.id || null,
          selectedEntryId: null
        });
        eventBus.emit('data:imported');
        return true;
      } catch (e) {
        console.error('Import failed', e);
        return false;
      }
    },

    getPlantEntries: (plantId) => {
      return get().entries
        .filter((e) => e.plantId === plantId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    getPlantHealth: (plantId) => {
      const plant = get().plants.find((p) => p.id === plantId);
      return plant?.health ?? 100;
    },

    recalculateAllHealth: () => {
      const state = get();
      const plantHealthMap: Record<string, number> = {};
      state.plants.forEach((p) => {
        plantHealthMap[p.id] = 100;
      });
      const sorted = [...state.entries].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      sorted.forEach((e) => {
        plantHealthMap[e.plantId] = Math.min(
          100,
          Math.max(0, (plantHealthMap[e.plantId] ?? 100) + CARE_TYPE_HEALTH_CHANGE[e.type])
        );
      });
      const newPlants = state.plants.map((p) => ({
        ...p,
        health: plantHealthMap[p.id] ?? 100
      }));
      saveToStorage(newPlants, state.entries);
      set({ plants: newPlants });
    }
  };
});
