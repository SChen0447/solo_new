import type { Pokemon, Skill, BattleLog, ElementType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const typeEffectiveness: Record<ElementType, Record<ElementType, number>> = {
  fire: { fire: 0.5, water: 0.5, grass: 2, electric: 1, ice: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, electric: 1, ice: 1 },
  grass: { fire: 0.5, water: 2, grass: 0.5, electric: 1, ice: 1 },
  electric: { fire: 1, water: 2, grass: 0.5, electric: 0.5, ice: 1 },
  ice: { fire: 0.5, water: 0.5, grass: 2, electric: 1, ice: 0.5 },
};

export function calculateEffectiveness(attackerType: ElementType, defenderType: ElementType): number {
  return typeEffectiveness[attackerType][defenderType] ?? 1;
}

export function getEffectivenessText(effectiveness: number): string {
  if (effectiveness >= 2) return '效果拔群！';
  if (effectiveness >= 1.5) return '效果不错';
  if (effectiveness <= 0.5 && effectiveness > 0) return '效果不佳...';
  if (effectiveness === 0) return '没有效果...';
  return '';
}

export function checkHit(accuracy: number): boolean {
  return Math.random() * 100 < accuracy;
}

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  effectiveness: number,
): number {
  const baseDamage = (attacker.attack * skill.power) / defender.defense;
  const randomFactor = 0.85 + Math.random() * 0.15;
  const damage = Math.floor(baseDamage * effectiveness * randomFactor);
  return Math.max(1, damage);
}

export function executeSingleAttack(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  turn: number,
  isPlayerAttack: boolean,
): { log: BattleLog; newDefenderHp: number } {
  const hit = checkHit(skill.accuracy);
  const effectiveness = calculateEffectiveness(skill.type, defender.type);
  const effectivenessText = getEffectivenessText(effectiveness);

  let damage = 0;
  let message = '';
  const defenderHpBefore = defender.hp;

  if (!hit) {
    message = `${attacker.name}使用了${skill.name}，但是没有命中！`;
  } else {
    damage = calculateDamage(attacker, defender, skill, effectiveness);
    const newHp = Math.max(0, defender.hp - damage);

    if (effectiveness >= 2) {
      message = `${attacker.name}使用了${skill.name}，对${defender.name}造成了${damage}点伤害！（${effectivenessText}）`;
    } else if (effectiveness <= 0.5) {
      message = `${attacker.name}使用了${skill.name}，对${defender.name}造成了${damage}点伤害...（${effectivenessText}）`;
    } else {
      message = `${attacker.name}使用了${skill.name}，对${defender.name}造成了${damage}点伤害！`;
    }

    if (newHp <= 0) {
      message += ` ${defender.name}倒下了！`;
    }

    return {
      log: {
        id: uuidv4(),
        turn,
        attacker: attacker.name,
        defender: defender.name,
        skill: skill.name,
        skillType: skill.type,
        damage,
        effectiveness,
        effectivenessText,
        hit: true,
        message,
        attackerHpBefore: attacker.hp,
        attackerHpAfter: attacker.hp,
        defenderHpBefore: defenderHpBefore,
        defenderHpAfter: newHp,
        isPlayerAttack,
      },
      newDefenderHp: newHp,
    };
  }

  return {
    log: {
      id: uuidv4(),
      turn,
      attacker: attacker.name,
      defender: defender.name,
      skill: skill.name,
      skillType: skill.type,
      damage: 0,
      effectiveness,
      effectivenessText,
      hit: false,
      message,
      attackerHpBefore: attacker.hp,
      attackerHpAfter: attacker.hp,
      defenderHpBefore: defenderHpBefore,
      defenderHpAfter: defenderHpBefore,
      isPlayerAttack,
    },
    newDefenderHp: defenderHpBefore,
  };
}

export interface TurnResult {
  logs: BattleLog[];
  playerHp: number;
  enemyHp: number;
}

export function executeTurn(
  playerPokemon: Pokemon,
  enemyPokemon: Pokemon,
  playerSkillIndex: number,
  enemySkillIndex: number,
  turn: number,
): TurnResult {
  const logs: BattleLog[] = [];
  let playerHp = playerPokemon.hp;
  let enemyHp = enemyPokemon.hp;

  const playerSkill = playerPokemon.skills[playerSkillIndex];
  const enemySkill = enemyPokemon.skills[enemySkillIndex];

  if (!playerSkill || !enemySkill) {
    return { logs, playerHp, enemyHp };
  }

  const playerFirst = playerPokemon.speed >= enemyPokemon.speed;

  if (playerFirst) {
    const playerResult = executeSingleAttack(
      { ...playerPokemon, hp: playerHp },
      { ...enemyPokemon, hp: enemyHp },
      playerSkill,
      turn,
      true,
    );
    logs.push(playerResult.log);
    enemyHp = playerResult.newDefenderHp;

    if (enemyHp > 0) {
      const enemyResult = executeSingleAttack(
        { ...enemyPokemon, hp: enemyHp },
        { ...playerPokemon, hp: playerHp },
        enemySkill,
        turn,
        false,
      );
      logs.push(enemyResult.log);
      playerHp = enemyResult.newDefenderHp;
    }
  } else {
    const enemyResult = executeSingleAttack(
      { ...enemyPokemon, hp: enemyHp },
      { ...playerPokemon, hp: playerHp },
      enemySkill,
      turn,
      false,
    );
    logs.push(enemyResult.log);
    playerHp = enemyResult.newDefenderHp;

    if (playerHp > 0) {
      const playerResult = executeSingleAttack(
        { ...playerPokemon, hp: playerHp },
        { ...enemyPokemon, hp: enemyHp },
        playerSkill,
        turn,
        true,
      );
      logs.push(playerResult.log);
      enemyHp = playerResult.newDefenderHp;
    }
  }

  return { logs, playerHp, enemyHp };
}

export function checkBattleEnd(playerTeam: Pokemon[], enemyTeam: Pokemon[]): 'player' | 'enemy' | null {
  const playerAllFainted = playerTeam.every((p) => p.hp <= 0);
  const enemyAllFainted = enemyTeam.every((p) => p.hp <= 0);

  if (playerAllFainted) return 'enemy';
  if (enemyAllFainted) return 'player';
  return null;
}

export function getNextAliveIndex(team: Pokemon[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < team.length; i++) {
    if (team[i].hp > 0) return i;
  }
  for (let i = 0; i < currentIndex; i++) {
    if (team[i].hp > 0) return i;
  }
  return currentIndex;
}

export function generateEnemyTeam(playerTeam: Pokemon[]): Pokemon[] {
  const types: ElementType[] = ['fire', 'water', 'grass', 'electric', 'ice'];
  const enemyTeam: Pokemon[] = [];

  for (let i = 0; i < playerTeam.length; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const baseStats = getBaseStatsForType(type);
    const pokemon: Pokemon = {
      id: uuidv4(),
      name: `敌方${type.charAt(0).toUpperCase() + type.slice(1)}${i + 1}`,
      type,
      hp: baseStats.hp,
      maxHp: baseStats.hp,
      attack: baseStats.attack,
      defense: baseStats.defense,
      speed: baseStats.speed,
      skills: getRandomSkills(type, 3),
    };
    enemyTeam.push(pokemon);
  }

  return enemyTeam;
}

function getBaseStatsForType(type: ElementType): { hp: number; attack: number; defense: number; speed: number } {
  const statsMap: Record<ElementType, { hp: [number, number]; attack: [number, number]; defense: [number, number]; speed: [number, number] }> = {
    fire: { hp: [80, 100], attack: [85, 110], defense: [55, 75], speed: [70, 95] },
    water: { hp: [90, 110], attack: [65, 85], defense: [80, 105], speed: [60, 80] },
    grass: { hp: [95, 115], attack: [60, 80], defense: [75, 95], speed: [65, 85] },
    electric: { hp: [70, 90], attack: [75, 95], defense: [60, 75], speed: [90, 115] },
    ice: { hp: [75, 95], attack: [80, 100], defense: [65, 80], speed: [75, 95] },
  };
  const stats = statsMap[type];
  return {
    hp: Math.floor(stats.hp[0] + Math.random() * (stats.hp[1] - stats.hp[0])),
    attack: Math.floor(stats.attack[0] + Math.random() * (stats.attack[1] - stats.attack[0])),
    defense: Math.floor(stats.defense[0] + Math.random() * (stats.defense[1] - stats.defense[0])),
    speed: Math.floor(stats.speed[0] + Math.random() * (stats.speed[1] - stats.speed[0])),
  };
}

import { skillPool } from '@/data/skills';

function getRandomSkills(type: ElementType, count: number): Skill[] {
  const sameTypeSkills = skillPool.filter((s) => s.type === type);
  const otherSkills = skillPool.filter((s) => s.type !== type);

  const selected: Skill[] = [];
  const shuffledSame = [...sameTypeSkills].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count - 1, shuffledSame.length); i++) {
    selected.push({ ...shuffledSame[i], id: uuidv4(), pp: shuffledSame[i].maxPp });
  }

  const remaining = count - selected.length;
  const shuffledOther = [...otherSkills].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(remaining, shuffledOther.length); i++) {
    selected.push({ ...shuffledOther[i], id: uuidv4(), pp: shuffledOther[i].maxPp });
  }

  return selected.sort(() => Math.random() - 0.5);
}
