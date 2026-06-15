import { create } from 'zustand';

export type TransportType = 'walking' | 'bus' | 'subway' | 'car' | 'plane';
export type DietType = 'vegetarian' | 'meat' | 'takeout';
export type EnergyType = 'electricity' | 'gas' | 'heating';
export type ActivityCategory = 'transport' | 'diet' | 'energy';

export interface ActivityRecord {
  id: string;
  category: ActivityCategory;
  subType: TransportType | DietType | EnergyType;
  quantity: number;
  emission: number;
  timestamp: number;
  date: string;
}

export interface CategoryStats {
  transport: number;
  diet: number;
  energy: number;
}

export interface Suggestion {
  id: string;
  text: string;
  carbonSaving: number;
  progress: number;
  category: ActivityCategory;
  subType: TransportType | DietType | EnergyType;
  quantity: number;
}

const EMISSION_FACTORS: Record<string, number> = {
  walking: 0.0,
  bus: 0.089,
  subway: 0.041,
  car: 0.21,
  plane: 0.255,
  vegetarian: 0.5,
  meat: 2.5,
  takeout: 3.5,
  electricity: 0.785,
  gas: 2.0,
  heating: 2.3,
};

const MONTHLY_BUDGET = 300;

function getDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayStr(): string {
  return getDateStr(Date.now());
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateSeedData(): ActivityRecord[] {
  const records: ActivityRecord[] = [];
  const now = Date.now();
  const dayMs = 86400000;

  const templates: Array<{
    category: ActivityCategory;
    subType: TransportType | DietType | EnergyType;
    minQ: number;
    maxQ: number;
  }> = [
    { category: 'transport', subType: 'bus', minQ: 5, maxQ: 20 },
    { category: 'transport', subType: 'car', minQ: 10, maxQ: 30 },
    { category: 'transport', subType: 'subway', minQ: 8, maxQ: 25 },
    { category: 'transport', subType: 'plane', minQ: 500, maxQ: 2000 },
    { category: 'diet', subType: 'vegetarian', minQ: 1, maxQ: 3 },
    { category: 'diet', subType: 'meat', minQ: 1, maxQ: 3 },
    { category: 'diet', subType: 'takeout', minQ: 1, maxQ: 2 },
    { category: 'energy', subType: 'electricity', minQ: 3, maxQ: 15 },
    { category: 'energy', subType: 'gas', minQ: 1, maxQ: 5 },
    { category: 'energy', subType: 'heating', minQ: 2, maxQ: 8 },
  ];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayTs = now - dayOffset * dayMs;
    const dateStr = getDateStr(dayTs);
    const count = 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const t = templates[Math.floor(Math.random() * templates.length)];
      const quantity = t.minQ + Math.random() * (t.maxQ - t.minQ);
      const factor = EMISSION_FACTORS[t.subType];
      const emission = factor * quantity;

      records.push({
        id: generateId(),
        category: t.category,
        subType: t.subType,
        quantity: Math.round(quantity * 10) / 10,
        emission: Math.round(emission * 100) / 100,
        timestamp: dayTs + Math.floor(Math.random() * dayMs),
        date: dateStr,
      });
    }
  }

  return records;
}

function calcCategoryStats(records: ActivityRecord[]): CategoryStats {
  return records.reduce(
    (acc, r) => {
      acc[r.category] += r.emission;
      return acc;
    },
    { transport: 0, diet: 0, energy: 0 } as CategoryStats,
  );
}

function calcDailyEmissions(records: ActivityRecord[], days: number): Record<string, number> {
  const result: Record<string, number> = {};
  const now = Date.now();
  const dayMs = 86400000;

  for (let i = days - 1; i >= 0; i--) {
    const dateStr = getDateStr(now - i * dayMs);
    result[dateStr] = 0;
  }

  for (const r of records) {
    if (result[r.date] !== undefined) {
      result[r.date] += r.emission;
    }
  }

  return result;
}

function generateSuggestions(records: ActivityRecord[]): Suggestion[] {
  const now = Date.now();
  const threeDaysAgo = now - 3 * 86400000;
  const recent = records.filter((r) => r.timestamp >= threeDaysAgo);

  if (recent.length === 0) {
    return [
      {
        id: 'default-1',
        text: '开始记录您的日常活动，获取个性化减排建议',
        carbonSaving: 0,
        progress: 0,
        category: 'transport',
        subType: 'bus',
        quantity: 10,
      },
    ];
  }

  const stats = calcCategoryStats(recent);
  const suggestions: Suggestion[] = [];

  const recentTransport = recent.filter((r) => r.category === 'transport');
  const carUsage = recentTransport.filter((r) => r.subType === 'car');
  const planeUsage = recentTransport.filter((r) => r.subType === 'plane');
  const busUsage = recentTransport.filter((r) => r.subType === 'bus');

  if (planeUsage.length > 0) {
    const totalEmission = planeUsage.reduce((s, r) => s + r.emission, 0);
    const saving = totalEmission * 0.4;
    suggestions.push({
      id: 'plane-to-train',
      text: '您近期乘坐飞机较多，建议尝试高铁出行可减少40%碳排放',
      carbonSaving: Math.round(saving * 100) / 100,
      progress: Math.min(saving / 50, 1),
      category: 'transport',
      subType: 'subway',
      quantity: Math.round(planeUsage.reduce((s, r) => s + r.quantity, 0) * 0.3),
    });
  }

  if (carUsage.length > 0) {
    const totalEmission = carUsage.reduce((s, r) => s + r.emission, 0);
    const saving = totalEmission * 0.58;
    suggestions.push({
      id: 'car-to-bus',
      text: '您近期驾车较多，改乘公交可减少约58%碳排放',
      carbonSaving: Math.round(saving * 100) / 100,
      progress: Math.min(saving / 30, 1),
      category: 'transport',
      subType: 'bus',
      quantity: Math.round(carUsage.reduce((s, r) => s + r.quantity, 0)),
    });
  }

  const recentDiet = recent.filter((r) => r.category === 'diet');
  const meatUsage = recentDiet.filter((r) => r.subType === 'meat');
  const takeoutUsage = recentDiet.filter((r) => r.subType === 'takeout');

  if (meatUsage.length > 0) {
    const totalEmission = meatUsage.reduce((s, r) => s + r.emission, 0);
    const saving = totalEmission * 0.8;
    suggestions.push({
      id: 'meat-to-veg',
      text: '您近期荤食比例较高，每餐改素食可减少80%饮食碳排放',
      carbonSaving: Math.round(saving * 100) / 100,
      progress: Math.min(saving / 20, 1),
      category: 'diet',
      subType: 'vegetarian',
      quantity: meatUsage.length,
    });
  }

  if (takeoutUsage.length > 0) {
    const totalEmission = takeoutUsage.reduce((s, r) => s + r.emission, 0);
    const saving = totalEmission * 0.5;
    suggestions.push({
      id: 'takeout-to-cook',
      text: '外卖包装和运输产生额外碳排放，建议自行烹饪可减少50%排放',
      carbonSaving: Math.round(saving * 100) / 100,
      progress: Math.min(saving / 15, 1),
      category: 'diet',
      subType: 'vegetarian',
      quantity: takeoutUsage.length,
    });
  }

  const recentEnergy = recent.filter((r) => r.category === 'energy');
  const electricityUsage = recentEnergy.filter((r) => r.subType === 'electricity');

  if (electricityUsage.length > 0) {
    const totalEmission = electricityUsage.reduce((s, r) => s + r.emission, 0);
    const saving = totalEmission * 0.3;
    suggestions.push({
      id: 'save-electricity',
      text: '您近期用电量较高，随手关灯和使用节能电器可减少30%排放',
      carbonSaving: Math.round(saving * 100) / 100,
      progress: Math.min(saving / 10, 1),
      category: 'energy',
      subType: 'electricity',
      quantity: Math.round(electricityUsage.reduce((s, r) => s + r.quantity, 0) * 0.7),
    });
  }

  if (busUsage.length === 0 && stats.transport > 0) {
    suggestions.push({
      id: 'try-bus',
      text: '您尚未使用公共交通，尝试公交出行每公里仅0.089kg碳排放',
      carbonSaving: Math.round(stats.transport * 0.58),
      progress: 0.2,
      category: 'transport',
      subType: 'bus',
      quantity: 10,
    });
  }

  if (suggestions.length < 3) {
    suggestions.push({
      id: 'general-walk',
      text: '短途出行选择步行，零碳排放且有益健康',
      carbonSaving: 2.1,
      progress: 0.15,
      category: 'transport',
      subType: 'walking',
      quantity: 3,
    });
  }

  return suggestions.slice(0, 6);
}

interface CarbonState {
  records: ActivityRecord[];
  totalEmission: number;
  categoryStats: CategoryStats;
  dailyEmissions: Record<string, number>;
  suggestions: Suggestion[];
  viewMode: 'week' | 'month';

  addActivity: (category: ActivityCategory, subType: string, quantity: number) => void;
  removeActivity: (id: string) => void;
  setViewMode: (mode: 'week' | 'month') => void;
  getTodayEmission: () => number;
  getYesterdayEmission: () => number;
  getMonthEmission: () => number;
  getBudgetProgress: () => number;
}

const seedData = generateSeedData();

const useCarbonStore = create<CarbonState>((set, get) => {
  const initialStats = calcCategoryStats(seedData);
  const initialDaily = calcDailyEmissions(seedData, 7);
  const initialSuggestions = generateSuggestions(seedData);
  const initialTotal = seedData.reduce((s, r) => s + r.emission, 0);

  return {
    records: seedData,
    totalEmission: Math.round(initialTotal * 100) / 100,
    categoryStats: {
      transport: Math.round(initialStats.transport * 100) / 100,
      diet: Math.round(initialStats.diet * 100) / 100,
      energy: Math.round(initialStats.energy * 100) / 100,
    },
    dailyEmissions: initialDaily,
    suggestions: initialSuggestions,
    viewMode: 'week',

    addActivity: (category, subType, quantity) => {
      const factor = EMISSION_FACTORS[subType] ?? 0;
      const emission = Math.round(factor * quantity * 100) / 100;
      const record: ActivityRecord = {
        id: generateId(),
        category: category as ActivityCategory,
        subType: subType as TransportType | DietType | EnergyType,
        quantity,
        emission,
        timestamp: Date.now(),
        date: getTodayStr(),
      };

      set((state) => {
        const newRecords = [...state.records, record];
        const stats = calcCategoryStats(newRecords);
        const days = state.viewMode === 'week' ? 7 : 30;
        const daily = calcDailyEmissions(newRecords, days);
        const total = newRecords.reduce((s, r) => s + r.emission, 0);
        const suggestions = generateSuggestions(newRecords);

        return {
          records: newRecords,
          totalEmission: Math.round(total * 100) / 100,
          categoryStats: {
            transport: Math.round(stats.transport * 100) / 100,
            diet: Math.round(stats.diet * 100) / 100,
            energy: Math.round(stats.energy * 100) / 100,
          },
          dailyEmissions: daily,
          suggestions,
        };
      });
    },

    removeActivity: (id) => {
      set((state) => {
        const newRecords = state.records.filter((r) => r.id !== id);
        const stats = calcCategoryStats(newRecords);
        const days = state.viewMode === 'week' ? 7 : 30;
        const daily = calcDailyEmissions(newRecords, days);
        const total = newRecords.reduce((s, r) => s + r.emission, 0);
        const suggestions = generateSuggestions(newRecords);

        return {
          records: newRecords,
          totalEmission: Math.round(total * 100) / 100,
          categoryStats: {
            transport: Math.round(stats.transport * 100) / 100,
            diet: Math.round(stats.diet * 100) / 100,
            energy: Math.round(stats.energy * 100) / 100,
          },
          dailyEmissions: daily,
          suggestions,
        };
      });
    },

    setViewMode: (mode) => {
      set((state) => {
        const days = mode === 'week' ? 7 : 30;
        const daily = calcDailyEmissions(state.records, days);
        return { viewMode: mode, dailyEmissions: daily };
      });
    },

    getTodayEmission: () => {
      const today = getTodayStr();
      return get().records.filter((r) => r.date === today).reduce((s, r) => s + r.emission, 0);
    },

    getYesterdayEmission: () => {
      const yesterday = getDateStr(Date.now() - 86400000);
      return get().records.filter((r) => r.date === yesterday).reduce((s, r) => s + r.emission, 0);
    },

    getMonthEmission: () => {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return get().records.filter((r) => r.date.startsWith(monthStr)).reduce((s, r) => s + r.emission, 0);
    },

    getBudgetProgress: () => {
      const monthEmission = get().getMonthEmission();
      return Math.min(monthEmission / MONTHLY_BUDGET, 1);
    },
  };
});

export { EMISSION_FACTORS, MONTHLY_BUDGET };
export default useCarbonStore;
