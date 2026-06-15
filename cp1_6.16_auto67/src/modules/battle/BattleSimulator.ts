import type {
  Pet,
  BattleResult,
  BattleLogEntry,
  BattlePetStats,
  PetType,
} from './PokemonData';

const TYPE_ADVANTAGE: Record<PetType, PetType[]> = {
  fire: ['grass'],
  water: ['fire'],
  grass: ['water', 'electric'],
  electric: ['water'],
  dark: ['grass'],
};

interface BattlePet extends Pet {
  currentHp: number;
  maxHp: number;
}

export class BattleSimulator {
  private playerTeam: BattlePet[];
  private enemyTeam: BattlePet[];
  private logs: BattleLogEntry[] = [];
  private playerStats: Map<string, BattlePetStats> = new Map();
  private enemyStats: Map<string, BattlePetStats> = new Map();
  private turn: number = 0;
  private maxTurns: number = 10;

  constructor(playerPets: Pet[], enemyPets: Pet[]) {
    this.playerTeam = playerPets.map((pet) => ({
      ...pet,
      currentHp: pet.stats.hp,
      maxHp: pet.stats.hp,
    }));
    this.enemyTeam = enemyPets.map((pet) => ({
      ...pet,
      currentHp: pet.stats.hp,
      maxHp: pet.stats.hp,
    }));

    this.playerTeam.forEach((pet) => {
      this.playerStats.set(pet.id, {
        petId: pet.id,
        petName: pet.name,
        damageDealt: 0,
        damageTaken: 0,
        skillsUsed: {},
      });
    });
    this.enemyTeam.forEach((pet) => {
      this.enemyStats.set(pet.id, {
        petId: pet.id,
        petName: pet.name,
        damageDealt: 0,
        damageTaken: 0,
        skillsUsed: {},
      });
    });
  }

  simulate(): BattleResult {
    this.turn = 0;
    this.logs = [];

    while (this.turn < this.maxTurns) {
      this.turn++;

      const allAlive = [...this.playerTeam, ...this.enemyTeam]
        .filter((pet) => pet.currentHp > 0)
        .sort((a, b) => b.stats.speed - a.stats.speed);

      for (const attacker of allAlive) {
        if (attacker.currentHp <= 0) continue;

        const isPlayer = this.playerTeam.some((p) => p.id === attacker.id);
        const targets = isPlayer
          ? this.enemyTeam.filter((p) => p.currentHp > 0)
          : this.playerTeam.filter((p) => p.currentHp > 0);

        if (targets.length === 0) break;

        const target = targets[Math.floor(Math.random() * targets.length)];
        const skill = attacker.skills[Math.floor(Math.random() * attacker.skills.length)];

        const damage = this.calculateDamage(attacker, target, skill);
        const isCritical = Math.random() * 100 < attacker.stats.critRate;
        const finalDamage = isCritical ? Math.floor(damage * 1.5) : damage;

        target.currentHp = Math.max(0, target.currentHp - finalDamage);

        const attackerStats = isPlayer
          ? this.playerStats.get(attacker.id)!
          : this.enemyStats.get(attacker.id)!;
        const targetStats = isPlayer
          ? this.enemyStats.get(target.id)!
          : this.playerStats.get(target.id)!;

        attackerStats.damageDealt += finalDamage;
        targetStats.damageTaken += finalDamage;
        attackerStats.skillsUsed[skill.name] = (attackerStats.skillsUsed[skill.name] || 0) + 1;

        const side = isPlayer ? '玩家' : '敌方';
        const targetSide = isPlayer ? '敌方' : '玩家';

        let message = `【回合${this.turn}】${side}${attacker.name}使用${skill.name}造成${finalDamage}点伤害！`;
        if (isCritical) {
          message += ' ⚡暴击！';
        }
        message += ` ${targetSide}${target.name}剩余HP：${target.currentHp}/${target.maxHp}`;

        if (target.currentHp <= 0) {
          message += ` 💀${targetSide}${target.name}倒下了！`;
        }

        this.logs.push({
          turn: this.turn,
          message,
          isCritical,
        });
      }

      const playerAlive = this.playerTeam.some((p) => p.currentHp > 0);
      const enemyAlive = this.enemyTeam.some((p) => p.currentHp > 0);

      if (!playerAlive || !enemyAlive) {
        break;
      }
    }

    const playerAlive = this.playerTeam.some((p) => p.currentHp > 0);
    const enemyAlive = this.enemyTeam.some((p) => p.currentHp > 0);

    let winner: 'player' | 'enemy' | 'draw' = 'draw';
    if (playerAlive && !enemyAlive) {
      winner = 'player';
    } else if (!playerAlive && enemyAlive) {
      winner = 'enemy';
    }

    return {
      winner,
      logs: this.logs,
      playerStats: Array.from(this.playerStats.values()),
      enemyStats: Array.from(this.enemyStats.values()),
      totalTurns: this.turn,
    };
  }

  private calculateDamage(attacker: BattlePet, defender: BattlePet, skill: { power: number; type: PetType }): number {
    const baseDamage = skill.power * (attacker.stats.attack / defender.stats.defense) * 0.5;

    let typeMultiplier = 1;
    if (TYPE_ADVANTAGE[skill.type]?.includes(defender.type)) {
      typeMultiplier = 1.5;
    } else if (TYPE_ADVANTAGE[defender.type]?.includes(skill.type)) {
      typeMultiplier = 0.7;
    }

    const randomFactor = 0.9 + Math.random() * 0.2;

    return Math.floor(baseDamage * typeMultiplier * randomFactor);
  }

  static generateRandomEnemy(count: number = 3): Pet[] {
    const names = ['烈焰兽', '冰霜狼', '雷霆鸟', '暗影豹', '森林龙', '岩石龟', '风暴鹰', '毒蛇王'];
    const emojis = ['🐲', '🐺', '🦅', '🐆', '🌳', '🐢', '🦉', '🐍'];
    const types: PetType[] = ['fire', 'water', 'electric', 'dark', 'grass', 'water', 'electric', 'dark'];

    const enemies: Pet[] = [];
    const usedIndexes = new Set<number>();

    for (let i = 0; i < count; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * names.length);
      } while (usedIndexes.has(idx) && usedIndexes.size < names.length);
      usedIndexes.add(idx);

      const level = Math.floor(Math.random() * 15) + 3;
      const rarity = Math.floor(Math.random() * 4) + 1;

      const baseAttack = 35 + Math.floor(Math.random() * 30);
      const baseDefense = 30 + Math.floor(Math.random() * 25);
      const baseSpeed = 30 + Math.floor(Math.random() * 35);
      const baseHp = 40 + Math.floor(Math.random() * 40);
      const baseCrit = 3 + Math.floor(Math.random() * 10);

      const rarityMult = 1 + (rarity - 1) * 0.15;
      const levelBonus = level - 1;

      const pet: Pet = {
        id: `enemy-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: names[idx],
        emoji: emojis[idx],
        type: types[idx],
        rarity,
        level,
        exp: 0,
        expToNextLevel: Math.floor(100 * Math.pow(1.2, level)),
        stats: {
          attack: Math.floor(baseAttack * rarityMult + levelBonus * 2),
          defense: Math.floor(baseDefense * rarityMult + levelBonus * 2),
          speed: Math.floor(baseSpeed * rarityMult + levelBonus),
          hp: Math.floor(baseHp * rarityMult + levelBonus * 5),
          critRate: Math.min(baseCrit + levelBonus * 0.5, 50),
        },
        baseStats: {
          attack: Math.floor(baseAttack * rarityMult),
          defense: Math.floor(baseDefense * rarityMult),
          speed: Math.floor(baseSpeed * rarityMult),
          hp: Math.floor(baseHp * rarityMult),
          critRate: baseCrit,
        },
        skills: [
          { name: '普通攻击', type: types[idx], power: 30 + rarity * 5, description: '普通攻击' },
          { name: '强力攻击', type: types[idx], power: 45 + rarity * 5, description: '强力攻击' },
        ],
      };

      enemies.push(pet);
    }

    return enemies;
  }
}
