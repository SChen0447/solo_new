export interface WorkerInput {
  plantId: string;
  species: string;
  temperature: number;
  humidity: number;
  lightIntensity: number;
  currentGrowthIndex: number;
  deltaTime: number;
  age: number;
  maxAge: number;
}

export interface WorkerOutput {
  plantId: string;
  growthIndex: number;
  height: number;
  leafCount: number;
  fruitCount: number;
  fruitSize: number;
  healthScore: number;
  stressLevel: number;
  temperatureEffect: number;
  humidityEffect: number;
  lightEffect: number;
  leafCurl: number;
  leafYellow: number;
  stemThinness: number;
  overallWilt: number;
  status: {
    heatStress: boolean;
    coldStress: boolean;
    droughtStress: boolean;
    overwatering: boolean;
    lightDeficiency: boolean;
    lightBurn: boolean;
    leggyGrowth: boolean;
  };
}

interface SpeciesConfig {
  idealTemp: [number, number];
  idealHumidity: [number, number];
  idealLight: [number, number];
  baseHeight: number;
  baseLeaves: number;
  baseFruits: number;
  baseFruitSize: number;
  growthRate: number;
  stressTolerance: number;
}

const speciesConfigs: Record<string, SpeciesConfig> = {
  tomato: {
    idealTemp: [20, 28],
    idealHumidity: [60, 80],
    idealLight: [70, 150],
    baseHeight: 1.8,
    baseLeaves: 9,
    baseFruits: 6,
    baseFruitSize: 0.18,
    growthRate: 0.85,
    stressTolerance: 0.6,
  },
  strawberry: {
    idealTemp: [15, 25],
    idealHumidity: [65, 85],
    idealLight: [60, 140],
    baseHeight: 0.45,
    baseLeaves: 12,
    baseFruits: 8,
    baseFruitSize: 0.14,
    growthRate: 0.75,
    stressTolerance: 0.5,
  },
  lettuce: {
    idealTemp: [12, 22],
    idealHumidity: [50, 70],
    idealLight: [80, 160],
    baseHeight: 0.3,
    baseLeaves: 22,
    baseFruits: 0,
    baseFruitSize: 0,
    growthRate: 1.0,
    stressTolerance: 0.4,
  },
  cucumber: {
    idealTemp: [22, 30],
    idealHumidity: [70, 90],
    idealLight: [75, 150],
    baseHeight: 2.0,
    baseLeaves: 10,
    baseFruits: 5,
    baseFruitSize: 0.3,
    growthRate: 0.9,
    stressTolerance: 0.55,
  },
  pepper: {
    idealTemp: [20, 30],
    idealHumidity: [55, 75],
    idealLight: [80, 170],
    baseHeight: 1.1,
    baseLeaves: 11,
    baseFruits: 7,
    baseFruitSize: 0.15,
    growthRate: 0.8,
    stressTolerance: 0.65,
  },
  basil: {
    idealTemp: [18, 28],
    idealHumidity: [50, 70],
    idealLight: [90, 180],
    baseHeight: 0.6,
    baseLeaves: 20,
    baseFruits: 0,
    baseFruitSize: 0,
    growthRate: 1.05,
    stressTolerance: 0.5,
  },
};

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const calcIdealScore = (
  value: number,
  ideal: [number, number],
  tolerance: number
): number => {
  const [min, max] = ideal;
  if (value >= min && value <= max) {
    const mid = (min + max) / 2;
    const halfRange = (max - min) / 2;
    const dist = Math.abs(value - mid) / halfRange;
    return 1 - dist * 0.12;
  }
  const range = max - min;
  const penaltyRange = range * (1.2 / tolerance);
  if (value < min) {
    const dev = min - value;
    return clamp(1 - dev / penaltyRange, 0, 1);
  } else {
    const dev = value - max;
    return clamp(1 - dev / penaltyRange, 0, 1);
  }
};

const calcStressIntensity = (
  value: number,
  ideal: [number, number],
  direction: 'high' | 'low' | 'both'
): number => {
  const [min, max] = ideal;
  if (direction === 'high' && value > max) {
    const dev = value - max;
    const range = max - min;
    return clamp(dev / (range * 0.8), 0, 1);
  }
  if (direction === 'low' && value < min) {
    const dev = min - value;
    const range = max - min;
    return clamp(dev / (range * 0.8), 0, 1);
  }
  if (direction === 'both') {
    if (value > max) {
      const dev = value - max;
      const range = max - min;
      return clamp(dev / (range * 0.8), 0, 1);
    }
    if (value < min) {
      const dev = min - value;
      const range = max - min;
      return clamp(dev / (range * 0.8), 0, 1);
    }
  }
  return 0;
};

self.onmessage = (e: MessageEvent<WorkerInput>): void => {
  const {
    plantId,
    species,
    temperature,
    humidity,
    lightIntensity,
    currentGrowthIndex,
    deltaTime,
    age,
    maxAge,
  } = e.data;

  const config = speciesConfigs[species] || speciesConfigs.tomato;

  const tempEffect = calcIdealScore(
    temperature,
    config.idealTemp,
    config.stressTolerance
  );
  const humidityEffect = calcIdealScore(
    humidity,
    config.idealHumidity,
    config.stressTolerance
  );
  const lightEffect = calcIdealScore(
    lightIntensity,
    config.idealLight,
    config.stressTolerance
  );

  const combinedEffect =
    tempEffect * 0.35 + humidityEffect * 0.3 + lightEffect * 0.35;

  const ageFactor = clamp(1 - Math.pow(age / maxAge, 1.5), 0.08, 1);

  const growthRate =
    combinedEffect * config.growthRate * ageFactor * deltaTime * 10;
  const decayRate = Math.max(0, 1 - combinedEffect - 0.25) * deltaTime * 3.5;

  let growthIndex = currentGrowthIndex + (growthRate - decayRate);
  growthIndex = clamp(growthIndex, 0, 100);

  const growthProgress = clamp(growthIndex / 100, 0, 1);

  let height = config.baseHeight * (0.25 + growthProgress * 0.75);
  let leafCount = Math.round(config.baseLeaves * (0.15 + growthProgress * 0.85));
  let fruitCount =
    growthProgress > 0.25
      ? Math.round(
          config.baseFruits * ((growthProgress - 0.25) / 0.75)
        )
      : 0;
  let fruitSize = config.baseFruitSize * (0.5 + growthProgress * 0.5);

  const heatStress = temperature > config.idealTemp[1] + 4;
  const coldStress = temperature < config.idealTemp[0] - 6;
  const droughtStress = humidity < config.idealHumidity[0] - 18;
  const overwatering = humidity > config.idealHumidity[1] + 12;
  const lightDeficiency = lightIntensity < config.idealLight[0] * 0.45;
  const lightBurn = lightIntensity > config.idealLight[1] + 40;
  const leggyGrowth =
    lightIntensity < config.idealLight[0] * 0.6 &&
    temperature > config.idealTemp[0];

  const heatIntensity = calcStressIntensity(
    temperature,
    config.idealTemp,
    'high'
  );
  const coldIntensity = calcStressIntensity(
    temperature,
    config.idealTemp,
    'low'
  );
  const droughtIntensity = calcStressIntensity(
    humidity,
    config.idealHumidity,
    'low'
  );
  const overwaterIntensity = calcStressIntensity(
    humidity,
    config.idealHumidity,
    'high'
  );
  const lightDefIntensity = calcStressIntensity(
    lightIntensity,
    config.idealLight,
    'low'
  );
  const lightBurnIntensity = calcStressIntensity(
    lightIntensity,
    config.idealLight,
    'high'
  );

  const leafCurl = clamp(heatIntensity * 0.7 + droughtIntensity * 0.3, 0, 1);
  const leafYellow = clamp(
    heatIntensity * 0.5 +
      coldIntensity * 0.3 +
      droughtIntensity * 0.4 +
      lightBurnIntensity * 0.4 +
      overwaterIntensity * 0.25,
    0,
    1
  );
  const stemThinness =
    leggyGrowth || lightDeficiency
      ? clamp(lightDefIntensity * 0.8, 0, 0.65)
      : 0;
  const overallWilt = clamp(
    droughtIntensity * 0.7 + heatIntensity * 0.3 + overwaterIntensity * 0.4,
    0,
    1
  );

  if (leggyGrowth) {
    height *= 1 + stemThinness * 0.4;
    leafCount = Math.round(leafCount * (1 - stemThinness * 0.5));
  }

  if (overallWilt > 0) {
    height *= 1 - overallWilt * 0.25;
    leafCount = Math.max(
      Math.round(leafCount * (1 - overallWilt * 0.35)),
      1
    );
    fruitSize *= 1 - overallWilt * 0.4;
    fruitCount = Math.max(
      Math.round(fruitCount * (1 - overallWilt * 0.5)),
      0
    );
  }

  if (leafCurl > 0.3) {
    fruitSize *= 1 - leafCurl * 0.3;
  }

  const healthScore = Math.round(combinedEffect * 100);
  const stressLevel = Math.round((1 - combinedEffect) * 100);

  const output: WorkerOutput = {
    plantId,
    growthIndex: Math.round(growthIndex * 10) / 10,
    height: Math.round(height * 1000) / 1000,
    leafCount: Math.max(1, leafCount),
    fruitCount: Math.max(0, fruitCount),
    fruitSize: Math.round(fruitSize * 1000) / 1000,
    healthScore,
    stressLevel,
    temperatureEffect: Math.round(tempEffect * 100) / 100,
    humidityEffect: Math.round(humidityEffect * 100) / 100,
    lightEffect: Math.round(lightEffect * 100) / 100,
    leafCurl: Math.round(leafCurl * 100) / 100,
    leafYellow: Math.round(leafYellow * 100) / 100,
    stemThinness: Math.round(stemThinness * 100) / 100,
    overallWilt: Math.round(overallWilt * 100) / 100,
    status: {
      heatStress,
      coldStress,
      droughtStress,
      overwatering,
      lightDeficiency,
      lightBurn,
      leggyGrowth,
    },
  };

  self.postMessage(output);
};

export {};
