export interface Genes {
  colorR: number;
  colorG: number;
  colorB: number;
  size: number;
  sizeVariance: number;
  speed: number;
  acceleration: number;
  whiskerLength: number;
  whiskerCount: number;
  metabolism: number;
  energyEfficiency: number;
  senseRange: number;
  senseAngle: number;
  reproductionThreshold: number;
  dietPreference: number;
  aggression: number;
}

export type GeneKey = keyof Genes;

export const GENE_KEYS: GeneKey[] = [
  'colorR', 'colorG', 'colorB',
  'size', 'sizeVariance',
  'speed', 'acceleration',
  'whiskerLength', 'whiskerCount',
  'metabolism', 'energyEfficiency',
  'senseRange', 'senseAngle',
  'reproductionThreshold',
  'dietPreference', 'aggression'
];

export interface PerceptionInput {
  nearestFoodDirection: number;
  nearestFoodDistance: number;
  nearestObstacleDirection: number;
  nearestObstacleDistance: number;
  nearestOrganismDirection: number;
  nearestOrganismDistance: number;
  energyLevel: number;
  temperature: number;
}

export interface DecisionOutput {
  movement: number;
  rotation: number;
  action: number;
}

export interface Organism {
  id: string;
  generation: number;
  genes: Genes;
  x: number;
  y: number;
  rotation: number;
  velocity: number;
  angularVelocity: number;
  energy: number;
  maxEnergy: number;
  age: number;
  survivalTime: number;
  isAlive: boolean;
  isSelected: boolean;
  perception: PerceptionInput;
  lastDecision: DecisionOutput;
  networkWeights: number[];
}

export interface Food {
  id: string;
  x: number;
  y: number;
  energy: number;
  type: 'plant' | 'meat';
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  foodDensity: number;
  obstacleDensity: number;
  mutationRate: number;
}

export interface TrendRecord {
  generation: number;
  population: number;
  averageSpeed: number;
  averageSize: number;
  geneticDiversity: number;
}

export interface Statistics {
  averageSpeed: number;
  averageSize: number;
  geneticDiversity: number;
  trendHistory: TrendRecord[];
}

export enum EventType {
  ENVIRONMENT_CHANGED = 'environment:changed',
  SIMULATION_TICK = 'simulation:tick',
  GENERATION_COMPLETE = 'generation:complete',
  ORGANISM_CREATED = 'organism:created',
  ORGANISM_DIED = 'organism:died',
  ORGANISM_REPRODUCED = 'organism:reproduced',
  ORGANISM_SELECTED = 'organism:selected',
  UI_PARAMETER_CHANGED = 'ui:parameter:changed',
  UI_RESET_REQUESTED = 'ui:reset:requested',
  FPS_UPDATED = 'fps:updated',
  STATS_UPDATED = 'stats:updated',
}

export interface EventCallback<T = unknown> {
  (data: T): void;
}

export interface GameState {
  environment: EnvironmentParams;
  simulation: {
    generation: number;
    totalPopulation: number;
    organisms: Organism[];
    foods: Food[];
    obstacles: Obstacle[];
    fps: number;
    timeScale: number;
    isPaused: boolean;
  };
  statistics: Statistics;
  selectedOrganismId: string | null;
}
