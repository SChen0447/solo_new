import type { Egg, MapState, Pet, PetType } from '../battle/PokemonData';

const PET_TEMPLATES: Array<{
  name: string;
  emoji: string;
  type: PetType;
  baseStats: { attack: number; defense: number; speed: number; hp: number; critRate: number };
  skills: Array<{ name: string; type: PetType; power: number; description: string }>;
}> = [
  {
    name: '小火龙',
    emoji: '🐉',
    type: 'fire',
    baseStats: { attack: 52, defense: 43, speed: 65, hp: 39, critRate: 5 },
    skills: [
      { name: '火焰喷射', type: 'fire', power: 45, description: '喷出炽热的火焰攻击' },
      { name: '火花', type: 'fire', power: 30, description: '小型火花攻击' },
    ],
  },
  {
    name: '火狐狸',
    emoji: '🦊',
    type: 'fire',
    baseStats: { attack: 48, defense: 40, speed: 70, hp: 35, critRate: 8 },
    skills: [
      { name: '狐火', type: 'fire', power: 42, description: '神秘的蓝色火焰' },
      { name: '火花', type: 'fire', power: 28, description: '小型火花攻击' },
    ],
  },
  {
    name: '水箭龟',
    emoji: '🐢',
    type: 'water',
    baseStats: { attack: 40, defense: 65, speed: 30, hp: 55, critRate: 5 },
    skills: [
      { name: '水炮', type: 'water', power: 50, description: '强力水炮攻击' },
      { name: '水枪', type: 'water', power: 30, description: '水枪攻击' },
    ],
  },
  {
    name: '小海狮',
    emoji: '🦭',
    type: 'water',
    baseStats: { attack: 45, defense: 55, speed: 45, hp: 50, critRate: 6 },
    skills: [
      { name: '冰球', type: 'water', power: 48, description: '冰冻攻击' },
      { name: '水枪', type: 'water', power: 28, description: '水枪攻击' },
    ],
  },
  {
    name: '妙蛙花',
    emoji: '🌸',
    type: 'grass',
    baseStats: { attack: 49, defense: 49, speed: 45, hp: 45, critRate: 6 },
    skills: [
      { name: '飞叶快刀', type: 'grass', power: 42, description: '锋利的叶片攻击' },
      { name: '藤鞭', type: 'grass', power: 28, description: '藤蔓鞭打' },
    ],
  },
  {
    name: '草叶精',
    emoji: '🌿',
    type: 'grass',
    baseStats: { attack: 42, defense: 52, speed: 50, hp: 48, critRate: 7 },
    skills: [
      { name: '叶刃', type: 'grass', power: 40, description: '锋利的叶片切割' },
      { name: '吸取', type: 'grass', power: 25, description: '吸取生命能量' },
    ],
  },
  {
    name: '皮卡丘',
    emoji: '⚡',
    type: 'electric',
    baseStats: { attack: 55, defense: 40, speed: 90, hp: 35, critRate: 10 },
    skills: [
      { name: '十万伏特', type: 'electric', power: 55, description: '强力电击攻击' },
      { name: '电击', type: 'electric', power: 30, description: '普通电击攻击' },
    ],
  },
  {
    name: '雷电球',
    emoji: '💫',
    type: 'electric',
    baseStats: { attack: 50, defense: 45, speed: 75, hp: 40, critRate: 12 },
    skills: [
      { name: '打雷', type: 'electric', power: 52, description: '召唤雷电攻击' },
      { name: '电光一闪', type: 'electric', power: 25, description: '快速撞击' },
    ],
  },
  {
    name: '暗影猫',
    emoji: '🐱',
    type: 'dark',
    baseStats: { attack: 58, defense: 38, speed: 80, hp: 38, critRate: 15 },
    skills: [
      { name: '暗影球', type: 'dark', power: 50, description: '黑暗能量球' },
      { name: '撕咬', type: 'dark', power: 30, description: '锋利撕咬' },
    ],
  },
  {
    name: '夜精灵',
    emoji: '🌙',
    type: 'dark',
    baseStats: { attack: 48, defense: 50, speed: 55, hp: 55, critRate: 8 },
    skills: [
      { name: '暗夜冲击', type: 'dark', power: 48, description: '黑暗力量冲击' },
      { name: '偷袭', type: 'dark', power: 28, description: '出其不意的攻击' },
    ],
  },
];

const RARITY_MULTIPLIER: Record<number, number> = {
  1: 0.8,
  2: 1.0,
  3: 1.2,
  4: 1.4,
  5: 1.7,
};

export class MapEngine {
  private gridSize: number;
  private cellSize: number;
  private eggs: Egg[];
  private spawnInterval: ReturnType<typeof setInterval> | null = null;
  private onEggSpawn: ((egg: Egg) => void) | null = null;
  private onEggCollect: ((egg: Egg) => Pet | null) | null = null;

  constructor(gridSize = 10, cellSize = 50) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.eggs = [];
  }

  setOnEggSpawn(callback: (egg: Egg) => void) {
    this.onEggSpawn = callback;
  }

  setOnEggCollect(callback: (egg: Egg) => Pet | null) {
    this.onEggCollect = callback;
  }

  startSpawning(intervalMs = 5000) {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
    }
    this.spawnEgg();
    this.spawnInterval = setInterval(() => {
      if (this.eggs.length < 5) {
        this.spawnEgg();
      }
    }, intervalMs);
  }

  stopSpawning() {
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
  }

  private spawnEgg() {
    const eggId = `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const rarity = this.getRandomRarity();

    let x: number, y: number;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * this.gridSize);
      y = Math.floor(Math.random() * this.gridSize);
      attempts++;
    } while (this.isPositionOccupied(x, y) && attempts < 50);

    const egg: Egg = {
      id: eggId,
      x,
      y,
      rarity,
    };

    this.eggs.push(egg);

    if (this.onEggSpawn) {
      this.onEggSpawn(egg);
    }

    return egg;
  }

  private isPositionOccupied(x: number, y: number): boolean {
    return this.eggs.some((egg) => egg.x === x && egg.y === y);
  }

  private getRandomRarity(): number {
    const rand = Math.random() * 100;
    if (rand < 50) return 1;
    if (rand < 80) return 2;
    if (rand < 94) return 3;
    if (rand < 99) return 4;
    return 5;
  }

  collectEgg(eggId: string): Pet | null {
    const eggIndex = this.eggs.findIndex((e) => e.id === eggId);
    if (eggIndex === -1) return null;

    const egg = this.eggs[eggIndex];
    this.eggs.splice(eggIndex, 1);

    const pet = this.generatePetFromEgg(egg);

    if (this.onEggCollect) {
      this.onEggCollect(egg);
    }

    return pet;
  }

  private generatePetFromEgg(egg: Egg): Pet {
    const template = PET_TEMPLATES[Math.floor(Math.random() * PET_TEMPLATES.length)];
    const multiplier = RARITY_MULTIPLIER[egg.rarity] || 1;
    const level = Math.max(1, Math.floor(Math.random() * 5 + (egg.rarity - 1) * 2));

    const baseStats = {
      attack: Math.floor(template.baseStats.attack * multiplier),
      defense: Math.floor(template.baseStats.defense * multiplier),
      speed: Math.floor(template.baseStats.speed * multiplier),
      hp: Math.floor(template.baseStats.hp * multiplier * 2),
      critRate: template.baseStats.critRate + (egg.rarity - 1) * 2,
    };

    const levelBonus = level - 1;
    const stats = {
      attack: baseStats.attack + levelBonus * 2,
      defense: baseStats.defense + levelBonus * 2,
      speed: baseStats.speed + levelBonus,
      hp: baseStats.hp + levelBonus * 5,
      critRate: Math.min(baseStats.critRate + levelBonus * 0.5, 50),
    };

    const expToNextLevel = Math.floor(100 * Math.pow(1.2, level));

    return {
      id: `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      emoji: template.emoji,
      type: template.type,
      rarity: egg.rarity,
      level,
      exp: 0,
      expToNextLevel,
      stats,
      baseStats,
      skills: template.skills,
    };
  }

  getEggs(): Egg[] {
    return [...this.eggs];
  }

  getGridSize(): number {
    return this.gridSize;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  setMapState(mapState: MapState) {
    this.gridSize = mapState.gridSize;
    this.cellSize = mapState.cellSize;
    this.eggs = [...mapState.eggs];
  }

  getMapState(): MapState {
    return {
      eggs: [...this.eggs],
      gridSize: this.gridSize,
      cellSize: this.cellSize,
    };
  }
}
