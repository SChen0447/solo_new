import {
  PlantState,
  Environment,
  GrowthParams,
  GrowthInstruction,
  GrowthSnapshot,
  SeedVariety,
  Leaf,
  Flower,
  Fruit,
  STATE_COLORS,
  SEED_VARIETIES
} from '../types';

const STATE_TRANSITIONS: Record<PlantState, PlantState | null> = {
  [PlantState.SEED]: PlantState.SPROUT,
  [PlantState.SPROUT]: PlantState.MATURE,
  [PlantState.MATURE]: PlantState.FLOWERING,
  [PlantState.FLOWERING]: PlantState.FRUITING,
  [PlantState.FRUITING]: PlantState.WITHERED,
  [PlantState.WITHERED]: null
};

const STATE_HEIGHT_THRESHOLDS: Record<PlantState, number> = {
  [PlantState.SEED]: 0,
  [PlantState.SPROUT]: 0.02,
  [PlantState.MATURE]: 0.4,
  [PlantState.FLOWERING]: 0.85,
  [PlantState.FRUITING]: 0.95,
  [PlantState.WITHERED]: 1.0
};

const STATE_DURATION_DAYS: Record<PlantState, number> = {
  [PlantState.SEED]: 1,
  [PlantState.SPROUT]: 4,
  [PlantState.MATURE]: 10,
  [PlantState.FLOWERING]: 5,
  [PlantState.FRUITING]: 6,
  [PlantState.WITHERED]: 8
};

export type EngineListener = (instruction: GrowthInstruction) => void;
export type SnapshotListener = (snapshot: GrowthSnapshot) => void;

export class GrowthEngine {
  private variety: SeedVariety;
  private environment: Environment;
  private params: GrowthParams;
  private growthRateHistory: number[] = [];
  private leafIdCounter = 0;
  private flowerIdCounter = 0;
  private fruitIdCounter = 0;
  private listeners: Set<EngineListener> = new Set();
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private frameCount = 0;
  private elapsedTime = 0;
  private lastStateChangeTime = 0;
  private fps = 30;
  private randomSeed: number;

  constructor(varietyId: string = 'sunflower') {
    this.variety = SEED_VARIETIES.find(v => v.id === varietyId) || SEED_VARIETIES[0];
    this.environment = { light: 60, water: 60, temperature: 25 };
    this.randomSeed = Math.random() * 1000;
    this.params = this.createInitialParams();
  }

  private createInitialParams(): GrowthParams {
    return {
      state: PlantState.SEED,
      height: 0,
      leaves: [],
      flowers: [],
      fruits: [],
      growthDays: 0,
      growthRate: 0,
      stemSwayOffset: 0,
      stateProgress: 0
    };
  }

  setEnvironment(env: Partial<Environment>): void {
    this.environment = { ...this.environment, ...env };
  }

  getEnvironment(): Environment {
    return { ...this.environment };
  }

  setVariety(varietyId: string): void {
    const newVariety = SEED_VARIETIES.find(v => v.id === varietyId);
    if (newVariety) {
      this.variety = newVariety;
      this.reset();
    }
  }

  getVariety(): SeedVariety {
    return { ...this.variety };
  }

  reset(): void {
    this.params = this.createInitialParams();
    this.growthRateHistory = [];
    this.leafIdCounter = 0;
    this.flowerIdCounter = 0;
    this.fruitIdCounter = 0;
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.lastStateChangeTime = 0;
    this.randomSeed = Math.random() * 1000;
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private calculateEnvironmentFactor(): number {
    const { light, water, temperature } = this.environment;

    const lightFactor = this.bellCurve(light, 70, 30);
    const waterFactor = this.bellCurve(water, 65, 30);

    const tempOptimal = 25;
    const tempRange = 12;
    const tempFactor = this.bellCurve(temperature, tempOptimal, tempRange);

    const stressFactor = this.calculateStressFactor();

    return lightFactor * 0.4 + waterFactor * 0.35 + tempFactor * 0.25 - stressFactor;
  }

  private bellCurve(value: number, mean: number, std: number): number {
    const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(std, 2));
    return Math.exp(exponent);
  }

  private calculateStressFactor(): number {
    const { light, water, temperature } = this.environment;
    let stress = 0;

    if (light < 15) stress += 0.15;
    if (light > 95) stress += 0.1;
    if (water < 10) stress += 0.2;
    if (water > 95) stress += 0.08;
    if (temperature < 12 || temperature > 38) stress += 0.25;

    return Math.min(stress, 0.5);
  }

  private checkStateTransition(): void {
    const nextState = STATE_TRANSITIONS[this.params.state];
    if (!nextState) return;

    const stateDuration = STATE_DURATION_DAYS[this.params.state];
    const timeInState = this.params.growthDays - this.lastStateChangeTime;
    const timeProgress = Math.min(timeInState / stateDuration, 1);

    const heightRatio = Math.min(this.params.height / this.variety.maxHeight, 1);
    const heightThreshold = STATE_HEIGHT_THRESHOLDS[nextState];

    const envFactor = this.calculateEnvironmentFactor();
    const randomFactor = 0.7 + this.pseudoRandom(this.randomSeed + this.frameCount * 0.01) * 0.6;

    const transitionChance = (timeProgress * 0.5 + heightRatio * 0.3) * envFactor * randomFactor;

    if (heightRatio >= heightThreshold && transitionChance > 0.35) {
      this.transitionToState(nextState);
    }
  }

  private transitionToState(newState: PlantState): void {
    this.params.state = newState;
    this.params.stateProgress = 0;
    this.lastStateChangeTime = this.params.growthDays;

    if (newState === PlantState.FLOWERING) {
      this.spawnFlowers();
    } else if (newState === PlantState.FRUITING) {
      this.spawnFruits();
    }
  }

  private spawnFlowers(): void {
    const count = this.variety.id === 'cactus' ? 1 : 1 + Math.floor(this.pseudoRandom(this.randomSeed + 100) * 2);
    for (let i = 0; i < count; i++) {
      const flower: Flower = {
        id: this.flowerIdCounter++,
        petalCount: this.variety.petalCount,
        color: this.variety.flowerColor,
        secondaryColor: this.variety.flowerSecondaryColor,
        size: this.variety.flowerSize,
        growthProgress: 0,
        angle: i * 0.3
      };
      this.params.flowers.push(flower);
    }
  }

  private spawnFruits(): void {
    const count = Math.min(this.params.flowers.length, this.variety.id === 'cactus' ? 1 : 2);
    for (let i = 0; i < count; i++) {
      const fruit: Fruit = {
        id: this.fruitIdCounter++,
        size: this.variety.fruitSize,
        color: this.variety.fruitColor,
        growthProgress: 0,
        positionY: this.variety.maxHeight * (0.7 + this.pseudoRandom(this.randomSeed + 200 + i) * 0.2)
      };
      this.params.fruits.push(fruit);
    }
    if (this.variety.id !== 'cactus') {
      this.params.flowers = [];
    }
  }

  private growHeight(envFactor: number, deltaDays: number): void {
    if (this.params.state === PlantState.WITHERED) return;

    const baseRate = this.variety.baseGrowthRate;
    const stateMultiplier = this.getStateGrowthMultiplier();
    const randomVar = 0.85 + this.pseudoRandom(this.randomSeed + this.frameCount * 0.05) * 0.3;

    const growthAmount = baseRate * envFactor * stateMultiplier * randomVar * deltaDays;
    this.params.growthRate = growthAmount;
    this.params.height = Math.min(this.params.height + growthAmount, this.variety.maxHeight);
  }

  private getStateGrowthMultiplier(): number {
    switch (this.params.state) {
      case PlantState.SEED: return 0.3;
      case PlantState.SPROUT: return 1.5;
      case PlantState.MATURE: return 1.0;
      case PlantState.FLOWERING: return 0.3;
      case PlantState.FRUITING: return 0.1;
      default: return 0;
    }
  }

  private updateLeaves(deltaDays: number): void {
    if (this.params.state === PlantState.SEED || this.params.state === PlantState.WITHERED) return;

    const interval = this.variety.leafInterval;
    const expectedLeafCount = Math.floor(this.params.height / interval);

    while (this.params.leaves.length < expectedLeafCount) {
      const newLeafY = (this.params.leaves.length + 1) * interval;
      if (newLeafY <= this.params.height) {
        const side = this.params.leaves.length % 2 === 0 ? 'left' : 'right';
        const leaf: Leaf = {
          id: this.leafIdCounter++,
          positionY: newLeafY,
          side,
          growthProgress: 0,
          size: this.variety.leafSize * (0.9 + this.pseudoRandom(this.randomSeed + this.leafIdCounter) * 0.2),
          angle: (side === 'left' ? -1 : 1) * (0.3 + this.pseudoRandom(this.randomSeed + this.leafIdCounter + 50) * 0.4)
        };
        this.params.leaves.push(leaf);
      } else {
        break;
      }
    }

    for (const leaf of this.params.leaves) {
      if (leaf.growthProgress < 1) {
        leaf.growthProgress = Math.min(leaf.growthProgress + deltaDays * 0.8, 1);
      }
    }
  }

  private updateFlowers(deltaDays: number): void {
    for (const flower of this.params.flowers) {
      if (flower.growthProgress < 1) {
        flower.growthProgress = Math.min(flower.growthProgress + deltaDays * 0.4, 1);
      }
    }
  }

  private updateFruits(deltaDays: number): void {
    for (const fruit of this.params.fruits) {
      if (fruit.growthProgress < 1) {
        fruit.growthProgress = Math.min(fruit.growthProgress + deltaDays * 0.3, 1);
      }
    }
  }

  private updateSway(deltaTime: number): void {
    const heightRatio = this.params.height / this.variety.maxHeight;
    const amplitude = heightRatio * 0.08;
    const frequency = 0.5;
    this.params.stemSwayOffset = Math.sin((this.elapsedTime + this.randomSeed) * frequency * Math.PI * 2) * amplitude;
  }

  private updateStateProgress(): void {
    const stateDuration = STATE_DURATION_DAYS[this.params.state];
    const timeInState = this.params.growthDays - this.lastStateChangeTime;
    this.params.stateProgress = Math.min(timeInState / stateDuration, 1);
  }

  step(deltaTime: number): void {
    this.frameCount++;
    this.elapsedTime += deltaTime;

    const deltaDays = 0.01 * 30 * deltaTime;
    this.params.growthDays += deltaDays;

    const envFactor = Math.max(0, this.calculateEnvironmentFactor());

    this.growHeight(envFactor, deltaDays);
    this.updateLeaves(deltaDays);
    this.updateFlowers(deltaDays);
    this.updateFruits(deltaDays);
    this.updateSway(deltaTime);
    this.updateStateProgress();
    this.checkStateTransition();

    this.growthRateHistory.push(this.params.growthRate);
    if (this.growthRateHistory.length > 50) {
      this.growthRateHistory.shift();
    }

    if (this.frameCount % 30 === 0) {
      this.fps = Math.round(1 / deltaTime);
      this.emitSnapshot();
    }

    this.emitInstruction();
  }

  private getStemColor(): string {
    if (this.params.state === PlantState.WITHERED) {
      return '#5d4037';
    }
    if (this.params.state === PlantState.SPROUT) {
      return '#66bb6a';
    }
    return this.variety.stemColor;
  }

  private getLeafColor(): string {
    if (this.params.state === PlantState.WITHERED) {
      return '#a1887f';
    }
    if (this.params.state === PlantState.SPROUT || this.params.stateProgress < 0.3) {
      return this.variety.leafColorYoung;
    }
    return this.variety.leafColorMature;
  }

  private emitInstruction(): void {
    const instruction: GrowthInstruction = {
      variety: this.variety,
      height: this.params.height,
      targetHeight: this.variety.maxHeight,
      sway: this.params.stemSwayOffset,
      leaves: this.params.leaves.map(l => ({ ...l })),
      flowers: this.params.flowers.map(f => ({ ...f })),
      fruits: this.params.fruits.map(f => ({ ...f })),
      state: this.params.state,
      stateColor: STATE_COLORS[this.params.state],
      stemColor: this.getStemColor(),
      leafColor: this.getLeafColor()
    };

    for (const listener of this.listeners) {
      listener(instruction);
    }
  }

  private emitSnapshot(): void {
    const snapshot: GrowthSnapshot = {
      params: {
        ...this.params,
        leaves: this.params.leaves.map(l => ({ ...l })),
        flowers: this.params.flowers.map(f => ({ ...f })),
        fruits: this.params.fruits.map(f => ({ ...f }))
      },
      variety: { ...this.variety },
      growthRateHistory: [...this.growthRateHistory],
      fps: this.fps
    };

    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }

  getSnapshot(): GrowthSnapshot {
    return {
      params: {
        ...this.params,
        leaves: this.params.leaves.map(l => ({ ...l })),
        flowers: this.params.flowers.map(f => ({ ...f })),
        fruits: this.params.fruits.map(f => ({ ...f }))
      },
      variety: { ...this.variety },
      growthRateHistory: [...this.growthRateHistory],
      fps: this.fps
    };
  }
}
