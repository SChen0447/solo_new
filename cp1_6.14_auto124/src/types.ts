export interface Bean {
  id: string;
  origin: string;
  process: string;
  altitude: string;
  flavorNotes: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  beanId: string;
  date: string;
  roastLevel: 'light' | 'medium' | 'medium-dark' | 'dark';
  inletTemp: number;
  outletTemp: number;
  duration: number;
  batchNumber: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  batchId: string;
  name: string;
  grindSize: string;
  waterTemp: number;
  ratio: string;
  pourMethod: string;
  totalTime: number;
  rating: number;
  steps: RecipeStep[];
  createdAt: string;
}

export interface RecipeStep {
  order: number;
  description: string;
  duration: number;
  waterAmount?: number;
}

export interface Tasting {
  id: string;
  batchId: string;
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  notes: string;
  tasterName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalBeans: number;
  thisMonthBatches: number;
  highestRatedBatch: Batch & { avg: number } | null;
  recentAvgScore: number;
  batchGrowthRate: number;
}
