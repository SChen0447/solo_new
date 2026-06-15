export type PetType = 'fire' | 'water' | 'grass' | 'electric' | 'dark';

export interface PetStats {
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  critRate: number;
}

export interface Pet {
  id: string;
  name: string;
  emoji: string;
  type: PetType;
  rarity: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  stats: PetStats;
  baseStats: PetStats;
  skills: Skill[];
}

export interface Skill {
  name: string;
  type: PetType;
  power: number;
  description: string;
}

export interface Egg {
  id: string;
  x: number;
  y: number;
  rarity: number;
}

export interface Item {
  id: string;
  name: string;
  emoji: string;
  type: 'exp' | 'attack' | 'defense' | 'speed' | 'hp' | 'crit';
  value: number;
  count: number;
}

export interface BattleLogEntry {
  turn: number;
  message: string;
  isCritical?: boolean;
}

export interface BattlePetStats {
  petId: string;
  petName: string;
  damageDealt: number;
  damageTaken: number;
  skillsUsed: Record<string, number>;
}

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  logs: BattleLogEntry[];
  playerStats: BattlePetStats[];
  enemyStats: BattlePetStats[];
  totalTurns: number;
}

export interface MapState {
  eggs: Egg[];
  gridSize: number;
  cellSize: number;
}

export type PageType = 'map' | 'warehouse' | 'battle';

export interface GameState {
  pets: Pet[];
  petOrder: string[];
  items: Item[];
  selectedPetId: string | null;
  selectedForBattle: string[];
  mapState: MapState;
  battleResult: BattleResult | null;
  isBattling: boolean;
  currentPage: PageType;
  showPetDetail: boolean;
  hatchingEgg: Egg | null;
  addPet: (pet: Pet) => void;
  removePet: (petId: string) => void;
  updatePet: (petId: string, updates: Partial<Pet>) => void;
  setPetOrder: (order: string[]) => void;
  addItem: (item: Item) => void;
  useItem: (itemId: string, petId: string) => void;
  selectPet: (petId: string | null) => void;
  toggleBattleSelection: (petId: string) => void;
  setMapState: (state: MapState) => void;
  addEgg: (egg: Egg) => void;
  removeEgg: (eggId: string) => void;
  setBattleResult: (result: BattleResult | null) => void;
  setIsBattling: (battling: boolean) => void;
  setCurrentPage: (page: PageType) => void;
  setShowPetDetail: (show: boolean) => void;
  setHatchingEgg: (egg: Egg | null) => void;
}

export const TYPE_EMOJIS: Record<PetType, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  dark: '🌙',
};

export const TYPE_NAMES: Record<PetType, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  dark: '暗',
};
