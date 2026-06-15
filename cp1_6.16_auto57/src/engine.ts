import type {
  Attributes,
  Item,
  DungeonConfig,
  FloorResult,
  Monster,
  EncounterType,
} from './dataModels';
import {
  calculateLevel,
  applyLevelBonus,
  calculateAttack,
  calculateDefense,
  calculateMaxHp,
  calculateCritRate,
  calculateDamageReduction,
  sumAttributes,
  rollItemFromPool,
} from './dataModels';

export type FloorCallback = (result: FloorResult) => void;
export type FinishCallback = () => void;

export interface ExplorationState {
  currentFloor: number;
  attributes: Attributes;
  equippedItems: Item[];
  isRunning: boolean;
  speed: number;
}

const MONSTER_NAMES = [
  '史莱姆', '哥布林', '骷髅兵', '暗影蝙蝠', '石像鬼',
  '地精法师', '食人魔', '幽灵骑士', '熔岩巨像', '深渊恶魔',
];

function generateMonster(floor: number, playerAttributes: Attributes): Monster {
  const baseAttack = 5 + floor * 2;
  const baseDefense = 2 + floor * 1.2;
  const baseHp = 30 + floor * 15;

  const playerPower =
    playerAttributes.strength +
    playerAttributes.agility +
    playerAttributes.intelligence +
    playerAttributes.vitality;

  const scaling = 0.8 + (playerPower / 100) * 0.4;

  const attack = Math.round(baseAttack * scaling * (0.9 + Math.random() * 0.2));
  const defense = Math.round(baseDefense * scaling * (0.9 + Math.random() * 0.2));
  const maxHp = Math.round(baseHp * scaling * (0.9 + Math.random() * 0.2));

  const nameIndex = Math.min(Math.floor((floor - 1) / 2), MONSTER_NAMES.length - 1);
  const baseName = MONSTER_NAMES[nameIndex];
  const variants = ['普通', '强壮的', '精英', '狂暴的'];
  const variantIndex = Math.min(Math.floor(floor / 7), variants.length - 1);
  const name = floor > 6 ? `${variants[variantIndex]}${baseName}` : baseName;

  return { name, attack, defense, maxHp, hp: maxHp };
}

function simulateBattle(
  playerAttributes: Attributes,
  equippedItems: Item[],
  monster: Monster
): { duration: number; won: boolean } {
  const playerAttack = calculateAttack(playerAttributes, equippedItems);
  const playerDefense = calculateDefense(playerAttributes, equippedItems);
  const playerMaxHp = calculateMaxHp(playerAttributes);
  const playerCritRate = calculateCritRate(playerAttributes);

  const monsterDamageReduction = calculateDamageReduction(monster.defense);
  const playerDamageReduction = calculateDamageReduction(playerDefense);

  let playerHp = playerMaxHp;
  let monsterHp = monster.maxHp;
  let rounds = 0;

  while (playerHp > 0 && monsterHp > 0 && rounds < 100) {
    rounds++;

    const isCrit = Math.random() * 100 < playerCritRate;
    const playerDamage = isCrit
      ? playerAttack * 1.5 * (1 - monsterDamageReduction)
      : playerAttack * (1 - monsterDamageReduction);
    monsterHp -= playerDamage;

    if (monsterHp <= 0) break;

    const monsterDamage = monster.attack * (1 - playerDamageReduction);
    playerHp -= monsterDamage;
  }

  return { duration: rounds, won: monsterHp <= 0 };
}

function rollEncounterType(floor: number): EncounterType {
  const roll = Math.random() * 100;
  const monsterChance = 70 + floor * 0.5;
  const treasureChance = 15;

  if (roll < monsterChance) return 'monster';
  if (roll < monsterChance + treasureChance) return 'treasure';
  return 'empty';
}

export class DungeonEngine {
  private state: ExplorationState;
  private config: DungeonConfig;
  private itemPool: Item[];
  private intervalId: number | null = null;
  private onFloorCallback: FloorCallback | null = null;
  private onFinishCallback: FinishCallback | null = null;
  private baseAttributes: Attributes;

  constructor(
    baseAttributes: Attributes,
    itemPool: Item[],
    equippedItems: Item[] = [],
    config: DungeonConfig = { maxFloor: 20, monsterStrengthMultiplier: 1, dropRate: 0.4 }
  ) {
    this.baseAttributes = { ...baseAttributes };
    this.itemPool = [...itemPool];
    this.config = config;
    this.state = {
      currentFloor: 1,
      attributes: this.computeTotalAttributes(1, equippedItems),
      equippedItems: [...equippedItems],
      isRunning: false,
      speed: 1,
    };
  }

  private computeTotalAttributes(floor: number, items: Item[]): Attributes {
    const level = calculateLevel(floor);
    const leveledAttrs = applyLevelBonus(this.baseAttributes, level);
    return sumAttributes(leveledAttrs, items);
  }

  public setOnFloorCallback(callback: FloorCallback): void {
    this.onFloorCallback = callback;
  }

  public setOnFinishCallback(callback: FinishCallback): void {
    this.onFinishCallback = callback;
  }

  public setSpeed(speed: number): void {
    this.state.speed = Math.max(0.25, Math.min(4, speed));
    if (this.state.isRunning && this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.start();
    }
  }

  public getState(): ExplorationState {
    return { ...this.state };
  }

  public setEquippedItems(items: Item[]): void {
    this.state.equippedItems = [...items];
    this.state.attributes = this.computeTotalAttributes(
      this.state.currentFloor,
      this.state.equippedItems
    );
  }

  public setBaseAttributes(attrs: Attributes): void {
    this.baseAttributes = { ...attrs };
    this.state.attributes = this.computeTotalAttributes(
      this.state.currentFloor,
      this.state.equippedItems
    );
  }

  public setItemPool(pool: Item[]): void {
    this.itemPool = [...pool];
  }

  public start(): void {
    if (this.state.isRunning) return;
    this.state.isRunning = true;

    const baseInterval = 1500;
    const interval = Math.max(375, baseInterval / this.state.speed);

    this.intervalId = window.setInterval(() => {
      this.step();
    }, interval);
  }

  public pause(): void {
    this.state.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public reset(): void {
    this.pause();
    this.state.currentFloor = 1;
    this.state.attributes = this.computeTotalAttributes(1, this.state.equippedItems);
  }

  public addItem(item: Item): void {
    if (this.state.equippedItems.length < 8) {
      this.state.equippedItems.push(item);
      this.state.attributes = this.computeTotalAttributes(
        this.state.currentFloor,
        this.state.equippedItems
      );
    }
  }

  public clearInventory(): Item[] {
    const items = [...this.state.equippedItems];
    this.state.equippedItems = [];
    this.state.attributes = this.computeTotalAttributes(
      this.state.currentFloor,
      this.state.equippedItems
    );
    return items;
  }

  private step(): void {
    if (this.state.currentFloor > this.config.maxFloor) {
      this.finish();
      return;
    }

    const floor = this.state.currentFloor;
    const level = calculateLevel(floor);
    const prevLevel = calculateLevel(floor - 1);
    const leveledUp = level > prevLevel;

    const totalAttributes = this.computeTotalAttributes(floor, this.state.equippedItems);
    this.state.attributes = totalAttributes;

    const encounterType = rollEncounterType(floor);
    let monster: Monster | undefined;
    let battleDuration = 0;
    let droppedItem: Item | undefined;

    if (encounterType === 'monster') {
      monster = generateMonster(floor, totalAttributes);
      const result = simulateBattle(totalAttributes, this.state.equippedItems, monster);
      battleDuration = result.duration;

      if (result.won) {
        const drop = rollItemFromPool(this.itemPool, floor);
        if (drop) {
          droppedItem = drop;
          if (this.state.equippedItems.length < 8) {
            this.addItem(drop);
          }
        }
      }
    } else if (encounterType === 'treasure') {
      const drop = rollItemFromPool(this.itemPool, floor);
      if (drop) {
        droppedItem = drop;
        if (this.state.equippedItems.length < 8) {
          this.addItem(drop);
        }
      }
      battleDuration = 0;
    }

    const floorResult: FloorResult = {
      floor,
      encounterType,
      monster,
      battleDuration,
      droppedItem,
      attributesSnapshot: { ...totalAttributes },
      level,
      leveledUp,
    };

    if (this.onFloorCallback) {
      this.onFloorCallback(floorResult);
    }

    this.state.currentFloor++;

    if (this.state.currentFloor > this.config.maxFloor) {
      this.finish();
    }
  }

  private finish(): void {
    this.pause();
    if (this.onFinishCallback) {
      this.onFinishCallback();
    }
  }

  public destroy(): void {
    this.pause();
    this.onFloorCallback = null;
    this.onFinishCallback = null;
  }
}

export function startExploration(
  baseAttributes: Attributes,
  itemPool: Item[],
  equippedItems: Item[],
  onFloor: FloorCallback,
  onFinish: FinishCallback,
  speed: number = 1
): DungeonEngine {
  const engine = new DungeonEngine(baseAttributes, itemPool, equippedItems);
  engine.setOnFloorCallback(onFloor);
  engine.setOnFinishCallback(onFinish);
  engine.setSpeed(speed);
  return engine;
}
