import { create } from 'zustand';
import type {
  GameState,
  Pet,
  Egg,
  Item,
  MapState,
  BattleResult,
  PageType,
} from '../modules/battle/PokemonData';

const initialPets: Pet[] = [
  {
    id: 'pet-1',
    name: '小火龙',
    emoji: '🐉',
    type: 'fire',
    rarity: 3,
    level: 5,
    exp: 120,
    expToNextLevel: 200,
    stats: { attack: 55, defense: 40, speed: 60, hp: 120, critRate: 10 },
    baseStats: { attack: 50, defense: 35, speed: 55, hp: 100, critRate: 5 },
    skills: [
      { name: '火焰喷射', type: 'fire', power: 45, description: '喷出炽热的火焰攻击' },
      { name: '火花', type: 'fire', power: 30, description: '小型火花攻击' },
    ],
  },
  {
    id: 'pet-2',
    name: '水箭龟',
    emoji: '🐢',
    type: 'water',
    rarity: 4,
    level: 8,
    exp: 250,
    expToNextLevel: 350,
    stats: { attack: 45, defense: 65, speed: 35, hp: 150, critRate: 5 },
    baseStats: { attack: 40, defense: 60, speed: 30, hp: 130, critRate: 5 },
    skills: [
      { name: '水炮', type: 'water', power: 50, description: '强力水炮攻击' },
      { name: '水枪', type: 'water', power: 30, description: '水枪攻击' },
    ],
  },
  {
    id: 'pet-3',
    name: '妙蛙花',
    emoji: '🌸',
    type: 'grass',
    rarity: 3,
    level: 6,
    exp: 180,
    expToNextLevel: 280,
    stats: { attack: 48, defense: 55, speed: 45, hp: 130, critRate: 8 },
    baseStats: { attack: 42, defense: 50, speed: 40, hp: 110, critRate: 5 },
    skills: [
      { name: '飞叶快刀', type: 'grass', power: 42, description: '锋利的叶片攻击' },
      { name: '藤鞭', type: 'grass', power: 28, description: '藤蔓鞭打' },
    ],
  },
];

const initialItems: Item[] = [
  { id: 'item-exp-1', name: '经验药水', emoji: '🧪', type: 'exp', value: 100, count: 5 },
  { id: 'item-atk-1', name: '力量果实', emoji: '🍎', type: 'attack', value: 5, count: 3 },
  { id: 'item-def-1', name: '铁壁果实', emoji: '🥝', type: 'defense', value: 5, count: 3 },
  { id: 'item-spd-1', name: '疾风果实', emoji: '🍃', type: 'speed', value: 3, count: 2 },
  { id: 'item-hp-1', name: '生命果实', emoji: '❤️', type: 'hp', value: 20, count: 3 },
  { id: 'item-crit-1', name: '暴击果实', emoji: '⭐', type: 'crit', value: 2, count: 2 },
];

const initialMapState: MapState = {
  eggs: [],
  gridSize: 10,
  cellSize: 50,
};

export const useGameStore = create<GameState>((set, get) => ({
  pets: initialPets,
  petOrder: initialPets.map((p) => p.id),
  items: initialItems,
  selectedPetId: null,
  selectedForBattle: [],
  mapState: initialMapState,
  battleResult: null,
  isBattling: false,
  currentPage: 'map',
  showPetDetail: false,
  hatchingEgg: null,

  addPet: (pet: Pet) =>
    set((state) => ({
      pets: [...state.pets, pet],
      petOrder: [...state.petOrder, pet.id],
    })),

  removePet: (petId: string) =>
    set((state) => ({
      pets: state.pets.filter((p) => p.id !== petId),
      petOrder: state.petOrder.filter((id) => id !== petId),
    })),

  updatePet: (petId: string, updates: Partial<Pet>) =>
    set((state) => ({
      pets: state.pets.map((p) =>
        p.id === petId ? { ...p, ...updates } : p
      ),
    })),

  setPetOrder: (order: string[]) => set({ petOrder: order }),

  addItem: (item: Item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, count: i.count + item.count } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  useItem: (itemId: string, petId: string) => {
    const state = get();
    const item = state.items.find((i) => i.id === itemId);
    const pet = state.pets.find((p) => p.id === petId);

    if (!item || !pet || item.count <= 0) return;

    const updatedPet = { ...pet };
    const updatedStats = { ...pet.stats };

    if (item.type === 'exp') {
      let newExp = pet.exp + item.value;
      let newLevel = pet.level;
      let expToNext = pet.expToNextLevel;

      while (newExp >= expToNext && newLevel < 99) {
        newExp -= expToNext;
        newLevel++;
        expToNext = Math.floor(expToNext * 1.2);
        const levelDiff = newLevel - pet.level;
        updatedStats.attack = pet.baseStats.attack + levelDiff * 2;
        updatedStats.defense = pet.baseStats.defense + levelDiff * 2;
        updatedStats.speed = pet.baseStats.speed + levelDiff * 1;
        updatedStats.hp = pet.baseStats.hp + levelDiff * 5;
        updatedStats.critRate = pet.baseStats.critRate + levelDiff * 0.5;
      }

      updatedPet.level = newLevel;
      updatedPet.exp = newExp;
      updatedPet.expToNextLevel = expToNext;
      updatedPet.stats = updatedStats;
    } else if (item.type === 'attack') {
      updatedStats.attack += item.value;
    } else if (item.type === 'defense') {
      updatedStats.defense += item.value;
    } else if (item.type === 'speed') {
      updatedStats.speed += item.value;
    } else if (item.type === 'hp') {
      updatedStats.hp += item.value;
    } else if (item.type === 'crit') {
      updatedStats.critRate = Math.min(updatedStats.critRate + item.value, 50);
    }

    updatedPet.stats = updatedStats;

    set({
      pets: state.pets.map((p) => (p.id === petId ? updatedPet : p)),
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, count: i.count - 1 } : i
      ),
    });
  },

  selectPet: (petId: string | null) => set({ selectedPetId: petId }),

  toggleBattleSelection: (petId: string) =>
    set((state) => {
      const isSelected = state.selectedForBattle.includes(petId);
      if (isSelected) {
        return {
          selectedForBattle: state.selectedForBattle.filter((id) => id !== petId),
        };
      }
      if (state.selectedForBattle.length >= 3) {
        return {};
      }
      return {
        selectedForBattle: [...state.selectedForBattle, petId],
      };
    }),

  setMapState: (state: MapState) => set({ mapState: state }),

  addEgg: (egg: Egg) =>
    set((state) => ({
      mapState: {
        ...state.mapState,
        eggs: [...state.mapState.eggs, egg],
      },
    })),

  removeEgg: (eggId: string) =>
    set((state) => ({
      mapState: {
        ...state.mapState,
        eggs: state.mapState.eggs.filter((e) => e.id !== eggId),
      },
    })),

  setBattleResult: (result: BattleResult | null) => set({ battleResult: result }),

  setIsBattling: (battling: boolean) => set({ isBattling: battling }),

  setCurrentPage: (page: PageType) => set({ currentPage: page }),

  setShowPetDetail: (show: boolean) => set({ showPetDetail: show }),

  setHatchingEgg: (egg: Egg | null) => set({ hatchingEgg: egg }),
}));
