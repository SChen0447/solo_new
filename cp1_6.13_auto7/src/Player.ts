import { ItemType, Room } from './MapGenerator';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  attack: number;
  defense: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  gold: number;
  floor: number;
  score: number;
}

export interface InventoryItem {
  type: ItemType;
  count: number;
}

export class Player {
  x: number;
  y: number;
  stats: PlayerStats;
  inventory: InventoryItem[];
  isDead: boolean;
  currentRoom: Room | null;
  facing: 'up' | 'down' | 'left' | 'right';

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.facing = 'down';
    this.isDead = false;
    this.currentRoom = null;

    this.stats = {
      maxHp: 100,
      hp: 100,
      maxStamina: 50,
      stamina: 50,
      attack: 10,
      defense: 2,
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      gold: 0,
      floor: 1,
      score: 0
    };

    this.inventory = [
      { type: ItemType.HEALTH_POTION, count: 2 },
      { type: ItemType.STAMINA_POTION, count: 1 }
    ];
  }

  move(dx: number, dy: number): boolean {
    if (this.isDead) return false;
    if (this.stats.stamina <= 0) return false;

    if (dx > 0) this.facing = 'right';
    else if (dx < 0) this.facing = 'left';
    else if (dy > 0) this.facing = 'down';
    else if (dy < 0) this.facing = 'up';

    this.stats.stamina = Math.max(0, this.stats.stamina - 1);
    return true;
  }

  takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - actualDamage);
    if (this.stats.hp <= 0) {
      this.isDead = true;
    }
    return actualDamage;
  }

  heal(amount: number): number {
    const oldHp = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    return this.stats.hp - oldHp;
  }

  restoreStamina(amount: number): number {
    const oldStamina = this.stats.stamina;
    this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + amount);
    return this.stats.stamina - oldStamina;
  }

  gainExp(amount: number): boolean {
    this.stats.exp += amount;
    this.stats.score += amount;
    let leveledUp = false;

    while (this.stats.exp >= this.stats.expToNextLevel) {
      this.stats.exp -= this.stats.expToNextLevel;
      this.levelUp();
      leveledUp = true;
    }

    return leveledUp;
  }

  levelUp(): void {
    this.stats.level++;
    this.stats.maxHp += 20;
    this.stats.hp = this.stats.maxHp;
    this.stats.maxStamina += 10;
    this.stats.stamina = this.stats.maxStamina;
    this.stats.attack += 3;
    this.stats.defense += 1;
    this.stats.expToNextLevel = Math.floor(this.stats.expToNextLevel * 1.5);
  }

  useItem(itemType: ItemType): boolean {
    const item = this.inventory.find(i => i.type === itemType && i.count > 0);
    if (!item) return false;

    item.count--;

    switch (itemType) {
      case ItemType.HEALTH_POTION:
        this.heal(30);
        break;
      case ItemType.STAMINA_POTION:
        this.restoreStamina(25);
        break;
    }

    return true;
  }

  addItem(itemType: ItemType): void {
    const existing = this.inventory.find(i => i.type === itemType);
    if (existing) {
      existing.count++;
    } else {
      this.inventory.push({ type: itemType, count: 1 });
    }

    if (itemType === ItemType.SWORD) {
      this.stats.attack += 5;
    } else if (itemType === ItemType.SHIELD) {
      this.stats.defense += 3;
    } else if (itemType === ItemType.GOLD) {
      this.stats.gold += Math.floor(Math.random() * 20) + 10;
    }
  }

  calculateAttackDamage(): number {
    const baseDamage = this.stats.attack;
    const variance = Math.floor(Math.random() * 5) - 2;
    return Math.max(1, baseDamage + variance);
  }

  nextFloor(): void {
    this.stats.floor++;
    this.stats.score += 500;
    this.restoreStamina(Math.floor(this.stats.maxStamina * 0.5));
  }

  respawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.stats.stamina = this.stats.maxStamina;
  }
}
