import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  BalconyInfo,
  DailyClimateData,
  BalconyOrientation,
  ShadeLevel,
  PlantStatus,
  PlantSuccessRecord,
  PlantType
} from '../types';

const STORAGE_KEY_BALCONIES = 'balcony-garden-balconies';
const STORAGE_KEY_DATA = 'balcony-garden-data';
const STORAGE_KEY_SUCCESS = 'balcony-garden-success-records';

interface DataStoreState {
  balconies: BalconyInfo[];
  climateData: DailyClimateData[];
  successRecords: PlantSuccessRecord[];
  currentBalconyId: string | null;
  addBalcony: (orientation: BalconyOrientation, floor: number, shadeLevel: ShadeLevel) => BalconyInfo;
  setCurrentBalcony: (id: string | null) => void;
  addClimateData: (
    balconyId: string,
    date: string,
    maxTemp: number,
    minTemp: number,
    humidity: number,
    lightHours: number,
    lightIntensity: number,
    plantStatus?: PlantStatus
  ) => DailyClimateData;
  updateClimateDataStatus: (dataId: string, status: PlantStatus) => void;
  getClimateDataByBalcony: (balconyId: string) => DailyClimateData[];
  addSuccessRecord: (record: PlantSuccessRecord) => void;
  loadFromStorage: () => void;
}

const generateSampleSuccessRecords = (): PlantSuccessRecord[] => {
  const records: PlantSuccessRecord[] = [];
  const orientations: BalconyOrientation[] = ['east', 'south', 'west', 'north', 'southeast', 'southwest'];
  const shadeLevels: ShadeLevel[] = ['none', 'light', 'medium', 'heavy'];
  const floorRanges = ['1-5', '6-15', '16-30', '30+'];

  const plants: { name: string; type: PlantType; tags: string[]; orientPref: BalconyOrientation[]; shadePref: ShadeLevel[] }[] = [
    { name: '绿萝', type: 'foliage', tags: ['耐阴', '好养', '净化空气'], orientPref: ['north', 'east', 'northeast', 'northwest'], shadePref: ['medium', 'heavy'] },
    { name: '龟背竹', type: 'foliage', tags: ['耐阴', '喜湿', '网红植物'], orientPref: ['east', 'north', 'northeast'], shadePref: ['light', 'medium'] },
    { name: '虎皮兰', type: 'foliage', tags: ['耐旱', '耐阴', '净化空气'], orientPref: ['south', 'southeast', 'southwest', 'west'], shadePref: ['none', 'light'] },
    { name: '常春藤', type: 'foliage', tags: ['耐阴', '攀爬', '净化空气'], orientPref: ['east', 'north', 'northeast', 'northwest'], shadePref: ['medium', 'heavy'] },
    { name: '月季', type: 'flowering', tags: ['喜阳', '多花', '需修剪'], orientPref: ['south', 'southeast', 'southwest'], shadePref: ['none', 'light'] },
    { name: '绣球花', type: 'flowering', tags: ['半阴', '喜湿', '花团锦簇'], orientPref: ['east', 'southeast', 'northeast'], shadePref: ['light', 'medium'] },
    { name: '三角梅', type: 'flowering', tags: ['喜阳', '耐旱', '花期长'], orientPref: ['south', 'west', 'southwest', 'southeast'], shadePref: ['none', 'light'] },
    { name: '矮牵牛', type: 'flowering', tags: ['喜阳', '多花', '易种'], orientPref: ['south', 'southeast', 'southwest', 'west'], shadePref: ['none', 'light'] },
    { name: '多肉组合', type: 'succulent', tags: ['喜阳', '耐旱', '少浇水'], orientPref: ['south', 'southeast', 'southwest', 'west'], shadePref: ['none', 'light'] },
    { name: '仙人掌', type: 'succulent', tags: ['极耐旱', '喜阳', '好养'], orientPref: ['south', 'west', 'southwest'], shadePref: ['none'] },
    { name: '玉露', type: 'succulent', tags: ['半阴', '喜湿', '晶莹剔透'], orientPref: ['east', 'north', 'northeast'], shadePref: ['medium'] },
    { name: '薄荷', type: 'herb', tags: ['喜阳', '喜湿', '可食用'], orientPref: ['east', 'southeast', 'south', 'northeast'], shadePref: ['light', 'medium'] },
    { name: '罗勒', type: 'herb', tags: ['喜阳', '可食用', '香气浓'], orientPref: ['south', 'southeast', 'southwest'], shadePref: ['none', 'light'] },
    { name: '迷迭香', type: 'herb', tags: ['喜阳', '耐旱', '可食用'], orientPref: ['south', 'west', 'southwest', 'southeast'], shadePref: ['none', 'light'] },
    { name: '薰衣草', type: 'herb', tags: ['喜阳', '耐旱', '芳香'], orientPref: ['south', 'southeast', 'southwest'], shadePref: ['none', 'light'] }
  ];

  plants.forEach((plant) => {
    orientations.forEach((orient) => {
      shadeLevels.forEach((shade) => {
        floorRanges.forEach((floor) => {
          const orientMatch = plant.orientPref.includes(orient);
          const shadeMatch = plant.shadePref.includes(shade);
          let matchRate = 0.3;
          if (orientMatch) matchRate += 0.3;
          if (shadeMatch) matchRate += 0.25;
          matchRate += Math.random() * 0.15;
          matchRate = Math.min(matchRate, 0.98);

          const totalDays = 30 + Math.floor(Math.random() * 90);
          const happyDays = Math.floor(totalDays * matchRate);

          if (matchRate > 0.4) {
            records.push({
              plantName: plant.name,
              plantType: plant.type,
              balconyOrientation: orient,
              floorRange: floor,
              shadeLevel: shade,
              totalDays,
              happyDays,
              tags: plant.tags
            });
          }
        });
      });
    });
  });

  return records;
};

const saveToStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch (e) {
    console.error('Storage load error:', e);
  }
  return fallback;
};

export const useDataStore = create<DataStoreState>((set, get) => ({
  balconies: [],
  climateData: [],
  successRecords: [],
  currentBalconyId: null,

  addBalcony: (orientation, floor, shadeLevel) => {
    const newBalcony: BalconyInfo = {
      id: uuidv4(),
      orientation,
      floor,
      shadeLevel,
      createdAt: new Date().toISOString()
    };
    const updated = [...get().balconies, newBalcony];
    set({ balconies: updated, currentBalconyId: newBalcony.id });
    saveToStorage(STORAGE_KEY_BALCONIES, updated);
    return newBalcony;
  },

  setCurrentBalcony: (id) => set({ currentBalconyId: id }),

  addClimateData: (balconyId, date, maxTemp, minTemp, humidity, lightHours, lightIntensity, plantStatus) => {
    const existingIdx = get().climateData.findIndex((d) => d.balconyId === balconyId && d.date === date);
    let newData: DailyClimateData;

    if (existingIdx >= 0) {
      newData = {
        ...get().climateData[existingIdx],
        maxTemp,
        minTemp,
        humidity,
        lightHours,
        lightIntensity,
        plantStatus: plantStatus ?? get().climateData[existingIdx].plantStatus
      };
      const updated = [...get().climateData];
      updated[existingIdx] = newData;
      set({ climateData: updated });
      saveToStorage(STORAGE_KEY_DATA, updated);
    } else {
      newData = {
        id: uuidv4(),
        balconyId,
        date,
        maxTemp,
        minTemp,
        humidity,
        lightHours,
        lightIntensity,
        plantStatus
      };
      const updated = [...get().climateData, newData];
      set({ climateData: updated });
      saveToStorage(STORAGE_KEY_DATA, updated);
    }
    return newData;
  },

  updateClimateDataStatus: (dataId, status) => {
    const updated = get().climateData.map((d) =>
      d.id === dataId ? { ...d, plantStatus: status } : d
    );
    set({ climateData: updated });
    saveToStorage(STORAGE_KEY_DATA, updated);
  },

  getClimateDataByBalcony: (balconyId) => {
    return get().climateData
      .filter((d) => d.balconyId === balconyId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  addSuccessRecord: (record) => {
    const updated = [...get().successRecords, record];
    set({ successRecords: updated });
    saveToStorage(STORAGE_KEY_SUCCESS, updated);
  },

  loadFromStorage: () => {
    const balconies = loadFromStorage<BalconyInfo[]>(STORAGE_KEY_BALCONIES, []);
    const climateData = loadFromStorage<DailyClimateData[]>(STORAGE_KEY_DATA, []);
    let successRecords = loadFromStorage<PlantSuccessRecord[]>(STORAGE_KEY_SUCCESS, []);

    if (successRecords.length === 0) {
      successRecords = generateSampleSuccessRecords();
      saveToStorage(STORAGE_KEY_SUCCESS, successRecords);
    }

    set({
      balconies,
      climateData,
      successRecords,
      currentBalconyId: balconies.length > 0 ? balconies[0].id : null
    });
  }
}));
