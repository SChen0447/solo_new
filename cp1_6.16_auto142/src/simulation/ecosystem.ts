export type TerrainType = 'forest' | 'grassland' | 'desert' | 'water' | 'mountain' | 'wasteland';

export type DietType = 'herbivore' | 'carnivore';

export interface TerrainConfig {
  food: number;
  water: number;
  color: string;
  passable: boolean;
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  originalTerrain: TerrainType;
  food: number;
  water: number;
  animals: Animal[];
  disasterTimer: number;
  disasterType: DisasterType | null;
}

export interface Animal {
  id: string;
  species: string;
  diet: DietType;
  hunger: number;
  x: number;
  y: number;
}

export type DisasterType = 'fire' | 'drought' | 'plague';

export interface DisasterEvent {
  type: DisasterType;
  cells: { x: number; y: number }[];
  message: string;
}

export interface EcosystemState {
  grid: Cell[][];
  step: number;
  width: number;
  height: number;
  currentDisaster: DisasterEvent | null;
}

export interface StatsSnapshot {
  herbivores: number;
  carnivores: number;
  avgResources: number;
  diversity: number;
}

const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  forest: { food: 3, water: 1, color: '#2E7D32', passable: true },
  grassland: { food: 2, water: 2, color: '#558B2F', passable: true },
  desert: { food: 0, water: 0, color: '#F9A825', passable: true },
  water: { food: 1, water: 3, color: '#1565C0', passable: false },
  mountain: { food: 0, water: 0, color: '#616161', passable: false },
  wasteland: { food: 0, water: 0, color: '#3E2723', passable: true },
};

const TERRAIN_TYPES: TerrainType[] = ['forest', 'grassland', 'desert', 'mountain'];

export function createEcosystem(width: number = 10, height: number = 10): EcosystemState {
  const grid: Cell[][] = [];

  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      const terrain = TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)];
      const config = TERRAIN_CONFIGS[terrain];
      row.push({
        x,
        y,
        terrain,
        originalTerrain: terrain,
        food: config.food,
        water: config.water,
        animals: [],
        disasterTimer: 0,
        disasterType: null,
      });
    }
    grid.push(row);
  }

  let rabbitCount = 0;
  while (rabbitCount < 6) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const cell = grid[y][x];
    if (TERRAIN_CONFIGS[cell.terrain].passable) {
      cell.animals.push({
        id: `rabbit_${rabbitCount}`,
        species: '兔子',
        diet: 'herbivore',
        hunger: 0,
        x,
        y,
      });
      rabbitCount++;
    }
  }

  let foxCount = 0;
  while (foxCount < 2) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const cell = grid[y][x];
    if (TERRAIN_CONFIGS[cell.terrain].passable) {
      cell.animals.push({
        id: `fox_${foxCount}`,
        species: '狐狸',
        diet: 'carnivore',
        hunger: 0,
        x,
        y,
      });
      foxCount++;
    }
  }

  return {
    grid,
    step: 0,
    width,
    height,
    currentDisaster: null,
  };
}

function getAdjacentCells(state: EcosystemState, x: number, y: number): { x: number; y: number }[] {
  const adjacent: { x: number; y: number }[] = [];
  const directions = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];

  for (const { dx, dy } of directions) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) {
      if (TERRAIN_CONFIGS[state.grid[ny][nx].terrain].passable) {
        adjacent.push({ x: nx, y: ny });
      }
    }
  }

  return adjacent;
}

function triggerDisaster(state: EcosystemState): DisasterEvent | null {
  if (state.step % 20 !== 0 || state.step === 0) return null;

  const disasterTypes: DisasterType[] = ['fire', 'drought', 'plague'];
  const type = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];

  const affectedCells: { x: number; y: number }[] = [];
  const cellCount = Math.floor(Math.random() * 3) + 3;

  while (affectedCells.length < cellCount) {
    const x = Math.floor(Math.random() * state.width);
    const y = Math.floor(Math.random() * state.height);
    if (!affectedCells.some((c) => c.x === x && c.y === y)) {
      affectedCells.push({ x, y });
    }
  }

  const messages: Record<DisasterType, string> = {
    fire: '⚠️ 火灾爆发！',
    drought: '⚠️ 干旱来袭！',
    plague: '⚠️ 瘟疫蔓延！',
  };

  for (const { x, y } of affectedCells) {
    const cell = state.grid[y][x];
    if (type === 'fire') {
      cell.originalTerrain = cell.terrain;
      cell.terrain = 'wasteland';
      cell.disasterTimer = 3;
      cell.disasterType = 'fire';
      cell.food = 0;
      cell.water = 0;
    } else if (type === 'drought') {
      cell.water = Math.floor(cell.water * 0.5);
      cell.disasterTimer = 2;
      cell.disasterType = 'drought';
    } else if (type === 'plague') {
      const killCount = Math.floor(cell.animals.length / 2);
      cell.animals = cell.animals.slice(0, cell.animals.length - killCount);
      cell.disasterTimer = 1;
      cell.disasterType = 'plague';
    }
  }

  return {
    type,
    cells: affectedCells,
    message: messages[type],
  };
}

function updateDisasterEffects(state: EcosystemState): void {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.grid[y][x];
      if (cell.disasterTimer > 0) {
        cell.disasterTimer--;
        if (cell.disasterTimer === 0 && cell.disasterType === 'fire') {
          cell.terrain = cell.originalTerrain;
          const config = TERRAIN_CONFIGS[cell.terrain];
          cell.food = config.food;
          cell.water = config.water;
        }
        if (cell.disasterTimer === 0) {
          cell.disasterType = null;
        }
      }
    }
  }
}

export function stepEcosystem(state: EcosystemState): {
  state: EcosystemState;
  disaster: DisasterEvent | null;
} {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  newState.step++;

  updateDisasterEffects(newState);

  const allAnimals: Animal[] = [];
  for (let y = 0; y < newState.height; y++) {
    for (let x = 0; x < newState.width; x++) {
      for (const animal of newState.grid[y][x].animals) {
        allAnimals.push({ ...animal });
      }
      newState.grid[y][x].animals = [];
    }
  }

  const survivingAnimals: Animal[] = [];

  for (const animal of allAnimals) {
    const adjacent = getAdjacentCells(newState, animal.x, animal.y);
    if (adjacent.length > 0) {
      const target = adjacent[Math.floor(Math.random() * adjacent.length)];
      animal.x = target.x;
      animal.y = target.y;
    }

    const cell = newState.grid[animal.y][animal.x];

    if (animal.diet === 'herbivore') {
      if (cell.food > 0) {
        cell.food -= 1;
        animal.hunger = 0;
        survivingAnimals.push(animal);
        survivingAnimals.push({
          ...animal,
          id: `${animal.species}_${Date.now()}_${Math.random()}`,
          hunger: 0,
        });
      } else {
        animal.hunger++;
        if (animal.hunger <= 3) {
          survivingAnimals.push(animal);
        }
      }
    } else {
      const rabbitIndex = survivingAnimals.findIndex(
        (a) => a.diet === 'herbivore' && a.x === animal.x && a.y === animal.y
      );
      if (rabbitIndex !== -1) {
        survivingAnimals.splice(rabbitIndex, 1);
        animal.hunger = 0;
        survivingAnimals.push(animal);
        survivingAnimals.push({
          ...animal,
          id: `${animal.species}_${Date.now()}_${Math.random()}`,
          hunger: 0,
        });
      } else {
        animal.hunger++;
        if (animal.hunger <= 3) {
          survivingAnimals.push(animal);
        }
      }
    }
  }

  for (const animal of survivingAnimals) {
    newState.grid[animal.y][animal.x].animals.push(animal);
  }

  for (let y = 0; y < newState.height; y++) {
    for (let x = 0; x < newState.width; x++) {
      const cell = newState.grid[y][x];
      if (cell.disasterTimer === 0 || cell.disasterType !== 'drought') {
        const config = TERRAIN_CONFIGS[cell.terrain];
        cell.food = Math.min(cell.food + Math.floor(config.food * 0.3), config.food * 2);
        cell.water = Math.min(cell.water + Math.floor(config.water * 0.3), config.water * 2);
      }
    }
  }

  const disaster = triggerDisaster(newState);
  newState.currentDisaster = disaster;

  return { state: newState, disaster };
}

export function getStats(state: EcosystemState): StatsSnapshot {
  let herbivores = 0;
  let carnivores = 0;
  let totalResources = 0;
  const speciesCount: Record<string, number> = {};
  let totalCells = 0;

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.grid[y][x];
      totalResources += cell.food + cell.water;
      totalCells++;
      for (const animal of cell.animals) {
        if (animal.diet === 'herbivore') {
          herbivores++;
        } else {
          carnivores++;
        }
        speciesCount[animal.species] = (speciesCount[animal.species] || 0) + 1;
      }
    }
  }

  const totalAnimals = herbivores + carnivores;
  let diversity = 0;
  if (totalAnimals > 0) {
    for (const species in speciesCount) {
      const p = speciesCount[species] / totalAnimals;
      diversity -= p * Math.log(p);
    }
  }

  return {
    herbivores,
    carnivores,
    avgResources: totalResources / (totalCells * 2),
    diversity,
  };
}

export function placeFood(state: EcosystemState, x: number, y: number): EcosystemState {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  newState.grid[y][x].food += 5;
  return newState;
}

export function introduceSpecies(
  state: EcosystemState,
  x: number,
  y: number,
  name: string,
  diet: DietType
): EcosystemState {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  const cell = newState.grid[y][x];
  if (TERRAIN_CONFIGS[cell.terrain].passable) {
    for (let i = 0; i < 2; i++) {
      cell.animals.push({
        id: `${name}_${Date.now()}_${i}`,
        species: name,
        diet,
        hunger: 0,
        x,
        y,
      });
    }
  }
  return newState;
}

export function healAnimals(state: EcosystemState, x: number, y: number): EcosystemState {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  for (const animal of newState.grid[y][x].animals) {
    animal.hunger = 0;
  }
  return newState;
}

export function triggerManualDisaster(state: EcosystemState): {
  state: EcosystemState;
  disaster: DisasterEvent | null;
} {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  const originalStep = newState.step;
  newState.step = 20;
  const result = triggerDisaster(newState);
  newState.step = originalStep;
  newState.currentDisaster = result;
  return { state: newState, disaster: result };
}

export function resetTerrain(
  state: EcosystemState,
  x: number,
  y: number,
  terrain: TerrainType
): EcosystemState {
  const newState: EcosystemState = JSON.parse(JSON.stringify(state));
  const cell = newState.grid[y][x];
  const config = TERRAIN_CONFIGS[terrain];
  cell.terrain = terrain;
  cell.originalTerrain = terrain;
  cell.food = config.food;
  cell.water = config.water;
  cell.disasterTimer = 0;
  cell.disasterType = null;
  return newState;
}

export { TERRAIN_CONFIGS };
