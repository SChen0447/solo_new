interface WorkerInput {
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

interface WorkerOutput {
  plantId: string;
  growthIndex: number;
  heightFactor: number;
  leafFactor: number;
  fruitFactor: number;
  healthScore: number;
  stressLevel: number;
  temperatureEffect: number;
  humidityEffect: number;
  lightEffect: number;
  status: {
    heatStress: boolean;
    coldStress: boolean;
    droughtStress: boolean;
    overwatering: boolean;
    lightDeficiency: boolean;
    lightBurn: boolean;
  };
}

interface SpeciesConfig {
  idealTemp: [number, number];
  idealHumidity: [number, number];
  idealLight: [number, number];
  growthRate: number;
  stressTolerance: number;
}

const speciesConfigs: Record<string, SpeciesConfig> = {
  tomato: {
    idealTemp: [20, 28],
    idealHumidity: [60, 80],
    idealLight: [70, 150],
    growthRate: 0.8,
    stressTolerance: 0.6,
  },
  strawberry: {
    idealTemp: [15, 25],
    idealHumidity: [65, 85],
    idealLight: [60, 140],
    growthRate: 0.7,
    stressTolerance: 0.5,
  },
  lettuce: {
    idealTemp: [12, 22],
    idealHumidity: [50, 70],
    idealLight: [80, 160],
    growthRate: 1.0,
    stressTolerance: 0.4,
  },
  cucumber: {
    idealTemp: [22, 30],
    idealHumidity: [70, 90],
    idealLight: [75, 150],
    growthRate: 0.9,
    stressTolerance: 0.55,
  },
  pepper: {
    idealTemp: [20, 30],
    idealHumidity: [55, 75],
    idealLight: [80, 170],
    growthRate: 0.75,
    stressTolerance: 0.65,
  },
  basil: {
    idealTemp: [18, 28],
    idealHumidity: [50, 70],
    idealLight: [90, 180],
    growthRate: 1.1,
    stressTolerance: 0.5,
  },
};

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const calculateIdealScore = (
  value: number,
  ideal: [number, number],
  tolerance: number
): number => {
  const [min, max] = ideal;
  if (value >= min && value <= max) {
    const mid = (min + max) / 2;
    const halfRange = (max - min) / 2;
    const dist = Math.abs(value - mid) / halfRange;
    return 1 - dist * 0.15;
  }

  const range = max - min;
  const penaltyRange = range * (1 / tolerance);

  if (value < min) {
    const dev = min - value;
    const penalty = Math.min(dev / penaltyRange, 1);
    return 1 - penalty;
  } else {
    const dev = value - max;
    const penalty = Math.min(dev / penaltyRange, 1);
    return 1 - penalty;
  }
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

  const tempEffect = calculateIdealScore(
    temperature,
    config.idealTemp,
    config.stressTolerance
  );
  const humidityEffect = calculateIdealScore(
    humidity,
    config.idealHumidity,
    config.stressTolerance
  );
  const lightEffect = calculateIdealScore(
    lightIntensity,
    config.idealLight,
    config.stressTolerance
  );

  const combinedEffect =
    (tempEffect * 0.35 + humidityEffect * 0.3 + lightEffect * 0.35);

  const ageFactor = clamp(1 - Math.pow(age / maxAge, 2), 0.1, 1);
  const growthIncrement =
    combinedEffect * config.growthRate * ageFactor * deltaTime * 12;
  const decayRate = Math.max(0, (1 - combinedEffect) - 0.3) * deltaTime * 4;

  let newGrowthIndex = currentGrowthIndex + (growthIncrement - decayRate);
  newGrowthIndex = clamp(newGrowthIndex, 0, 100);

  const avgEffect = combinedEffect;
  let heightFactor = clamp(0.3 + newGrowthIndex / 100 * 0.7, 0.3, 1);
  let leafFactor = clamp(0.2 + newGrowthIndex / 100 * 0.8, 0.2, 1);
  let fruitFactor = clamp(Math.max(0, (newGrowthIndex - 30) / 70), 0, 1);

  if (avgEffect < 0.4 && newGrowthIndex < 50) {
    heightFactor *= 0.7;
    leafFactor *= 0.6;
    fruitFactor *= 0.3;
  }

  if (lightEffect < 0.5 && tempEffect > 0.6) {
    heightFactor = clamp(heightFactor * 1.25, 0.3, 1.15);
    leafFactor *= 0.7;
  }

  if (temperature > config.idealTemp[1] + 8) {
    leafFactor *= 0.65;
  }

  if (humidity < config.idealHumidity[0] - 25) {
    heightFactor *= 0.75;
    leafFactor *= 0.6;
  }

  const healthScore = Math.round(combinedEffect * 100);
  const stressLevel = Math.round((1 - combinedEffect) * 100);

  const status = {
    heatStress: temperature > config.idealTemp[1] + 5,
    coldStress: temperature < config.idealTemp[0] - 5,
    droughtStress: humidity < config.idealHumidity[0] - 20,
    overwatering: humidity > config.idealHumidity[1] + 15,
    lightDeficiency: lightIntensity < config.idealLight[0] * 0.5,
    lightBurn: lightIntensity > config.idealLight[1] + 30,
  };

  const output: WorkerOutput = {
    plantId,
    growthIndex: Math.round(newGrowthIndex * 10) / 10,
    heightFactor: Math.round(heightFactor * 1000) / 1000,
    leafFactor: Math.round(leafFactor * 1000) / 1000,
    fruitFactor: Math.round(fruitFactor * 1000) / 1000,
    healthScore,
    stressLevel,
    temperatureEffect: Math.round(tempEffect * 100) / 100,
    humidityEffect: Math.round(humidityEffect * 100) / 100,
    lightEffect: Math.round(lightEffect * 100) / 100,
    status,
  };

  self.postMessage(output);
};

export {};
