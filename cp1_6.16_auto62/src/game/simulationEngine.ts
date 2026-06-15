import type {
  Character,
  EnemyGroup,
  BattleCharacter,
  BattleEnemy,
  Skill,
  SkillAllocation,
  SingleBattleResult,
  BattleStatistics,
  BattleLogEntry,
  CharacterClass,
  Buff,
  Debuff,
} from './types';
import { CLASS_COLORS, AVAILABLE_CLASSES } from './dataStore';

const MAX_ROUNDS = 50;
const TOTAL_BATTLES = 1000;

const getSkillValue = (skill: Skill, allocation: SkillAllocation | undefined): number => {
  const level = allocation?.level || 0;
  return skill.baseValue * (1 + level * 0.1);
};

const getSkillAllocation = (skillId: string, allocations: SkillAllocation[]): SkillAllocation | undefined => {
  return allocations.find((a) => a.skillId === skillId);
};

const initializeBattleCharacter = (character: Character): BattleCharacter => {
  const template = character.template;
  let maxHp = template.baseHp;
  let attack = template.baseAttack;
  let defense = template.baseDefense;
  let speed = template.baseSpeed;

  template.skills.forEach((skill) => {
    if (skill.type === 'passive') {
      const allocation = getSkillAllocation(skill.id, character.skillAllocations);
      if (!allocation || allocation.level === 0) return;
      
      const value = getSkillValue(skill, allocation);
      switch (skill.effectType) {
        case 'buff':
          if (skill.id.includes('toughness') || skill.id.includes('soulstone')) {
            maxHp += value;
          } else if (skill.id.includes('armor') || skill.id.includes('ice_armor')) {
            defense += value;
          } else if (skill.id.includes('attack') || skill.id.includes('mana') || 
                     skill.id.includes('lethality') || skill.id.includes('marksmanship') ||
                     skill.id.includes('critical') || skill.id.includes('dark_pact') ||
                     skill.id.includes('spell_crit')) {
            attack += value;
          } else if (skill.id.includes('swift') || skill.id.includes('evasion')) {
            speed += value;
          }
          break;
      }
    }
  });

  return {
    id: character.id,
    template,
    skillAllocations: character.skillAllocations,
    currentHp: maxHp,
    maxHp,
    attack,
    defense,
    speed,
    cooldowns: {},
    buffs: [],
    debuffs: [],
    isAlive: true,
    totalDamageDealt: 0,
    totalHealingDone: 0,
    skillsUsed: {},
  };
};

const initializeBattleEnemies = (enemyGroup: EnemyGroup): BattleEnemy[] => {
  return enemyGroup.enemies.map((enemy) => ({
    id: enemy.id + '_' + Math.random().toString(36).substr(2, 5),
    unit: enemy,
    currentHp: enemy.hp,
    maxHp: enemy.hp,
    attack: enemy.attack,
    defense: enemy.defense,
    speed: enemy.speed,
    debuffs: [],
    isAlive: true,
    isControlled: false,
  }));
};

const calculateDamage = (attackerAtk: number, defenderDef: number, baseDamage: number): number => {
  const rawDamage = baseDamage + attackerAtk - defenderDef * 0.5;
  return Math.max(1, Math.floor(rawDamage * (0.9 + Math.random() * 0.2)));
};

const applyDebuffs = (entity: BattleCharacter | BattleEnemy): number => {
  let dotDamage = 0;
  entity.debuffs = entity.debuffs
    .map((debuff) => {
      if (debuff.type === 'poison') {
        dotDamage += debuff.value;
      }
      return { ...debuff, duration: debuff.duration - 1 };
    })
    .filter((d) => d.duration > 0);
  
  if ('isControlled' in entity) {
    entity.isControlled = entity.debuffs.some((d) => d.type === 'stun');
  }
  
  return dotDamage;
};

const applyBuffs = (character: BattleCharacter): void => {
  const expiredBuffs: string[] = [];
  character.buffs = character.buffs
    .map((buff) => {
      const newBuff = { ...buff, duration: buff.duration - 1 };
      if (newBuff.duration <= 0) {
        expiredBuffs.push(buff.type);
      }
      return newBuff;
    })
    .filter((b) => b.duration > 0);
};

const getEffectiveStats = (character: BattleCharacter): { attack: number; defense: number; speed: number } => {
  let attack = character.attack;
  let defense = character.defense;
  let speed = character.speed;

  character.buffs.forEach((buff) => {
    if (buff.type === 'attack') attack += buff.value;
    else if (buff.type === 'defense') defense += buff.value;
    else if (buff.type === 'speed') speed += buff.value;
  });

  character.debuffs.forEach((debuff) => {
    if (debuff.type === 'attack') attack -= debuff.value;
    else if (debuff.type === 'defense') defense -= debuff.value;
    else if (debuff.type === 'speed') speed -= debuff.value;
  });

  return {
    attack: Math.max(1, attack),
    defense: Math.max(0, defense),
    speed: Math.max(1, speed),
  };
};

const getEnemyEffectiveStats = (enemy: BattleEnemy): { attack: number; defense: number; speed: number } => {
  let attack = enemy.attack;
  let defense = enemy.defense;
  let speed = enemy.speed;

  enemy.debuffs.forEach((debuff) => {
    if (debuff.type === 'attack') attack -= debuff.value;
    else if (debuff.type === 'defense') defense -= debuff.value;
    else if (debuff.type === 'speed') speed -= debuff.value;
  });

  return {
    attack: Math.max(1, attack),
    defense: Math.max(0, defense),
    speed: Math.max(1, speed),
  };
};

const selectBestSkill = (character: BattleCharacter): Skill | null => {
  const availableSkills = character.template.skills.filter((skill) => {
    if (skill.type === 'passive') return false;
    const cooldown = character.cooldowns[skill.id] || 0;
    return cooldown === 0;
  });

  if (availableSkills.length === 0) return null;

  availableSkills.sort((a, b) => {
    const allocA = getSkillAllocation(a.id, character.skillAllocations);
    const allocB = getSkillAllocation(b.id, character.skillAllocations);
    const levelA = allocA?.level || 0;
    const levelB = allocB?.level || 0;
    
    if (levelB !== levelA) return levelB - levelA;
    return b.baseValue - a.baseValue;
  });

  return availableSkills[0];
};

const selectTarget = (enemies: BattleEnemy[], effectType: string): BattleEnemy | null => {
  const aliveEnemies = enemies.filter((e) => e.isAlive);
  if (aliveEnemies.length === 0) return null;

  if (effectType === 'aoe') return aliveEnemies[0];

  return aliveEnemies.reduce((lowest, enemy) => 
    enemy.currentHp < lowest.currentHp ? enemy : lowest
  );
};

const selectHealTarget = (characters: BattleCharacter[]): BattleCharacter | null => {
  const aliveChars = characters.filter((c) => c.isAlive);
  if (aliveChars.length === 0) return null;

  return aliveChars.reduce((lowest, char) => {
    const hpPercentA = lowest.currentHp / lowest.maxHp;
    const hpPercentB = char.currentHp / char.maxHp;
    return hpPercentB < hpPercentA ? char : lowest;
  });
};

const executeSkill = (
  attacker: BattleCharacter,
  skill: Skill,
  characters: BattleCharacter[],
  enemies: BattleEnemy[],
  log: BattleLogEntry[],
  round: number
): void => {
  const allocation = getSkillAllocation(skill.id, attacker.skillAllocations);
  const skillValue = getSkillValue(skill, allocation);
  const stats = getEffectiveStats(attacker);

  attacker.cooldowns[skill.id] = skill.cooldown;
  attacker.skillsUsed[skill.id] = (attacker.skillsUsed[skill.id] || 0) + 1;

  const logEntry: BattleLogEntry = {
    turn: round,
    actorId: attacker.id,
    actorName: attacker.template.name,
    action: skill.name,
  };

  switch (skill.effectType) {
    case 'single': {
      const target = selectTarget(enemies, 'single');
      if (target) {
        const targetStats = getEnemyEffectiveStats(target);
        const damage = calculateDamage(stats.attack, targetStats.defense, skillValue);
        target.currentHp -= damage;
        attacker.totalDamageDealt += damage;
        logEntry.targetId = target.id;
        logEntry.targetName = target.unit.name;
        logEntry.damage = damage;

        if (skill.id === 'warlock_soul_drain') {
          const healAmount = Math.floor(damage * 0.5);
          attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
          attacker.totalHealingDone += healAmount;
          logEntry.healing = healAmount;
        }
      }
      break;
    }
    case 'aoe': {
      enemies.forEach((enemy) => {
        if (enemy.isAlive) {
          const targetStats = getEnemyEffectiveStats(enemy);
          const damage = calculateDamage(stats.attack, targetStats.defense, skillValue);
          enemy.currentHp -= damage;
          attacker.totalDamageDealt += damage;
        }
      });
      logEntry.damage = skillValue;
      break;
    }
    case 'heal': {
      if (skill.id.includes('group')) {
        characters.forEach((char) => {
          if (char.isAlive) {
            const healAmount = skillValue;
            char.currentHp = Math.min(char.maxHp, char.currentHp + healAmount);
            attacker.totalHealingDone += healAmount;
          }
        });
        logEntry.healing = skillValue;
      } else {
        const target = selectHealTarget(characters);
        if (target) {
          const healAmount = skillValue;
          target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
          attacker.totalHealingDone += healAmount;
          logEntry.targetId = target.id;
          logEntry.targetName = target.template.name;
          logEntry.healing = healAmount;
        }
      }
      break;
    }
    case 'buff': {
      const buff: Buff = {
        type: 'attack',
        value: skillValue,
        duration: 3,
      };
      if (skill.id.includes('divine_shield') || skill.id.includes('shield')) {
        buff.type = 'defense';
      }
      characters.forEach((char) => {
        if (char.isAlive) {
          char.buffs.push({ ...buff });
        }
      });
      break;
    }
    case 'debuff': {
      const debuff: Debuff = {
        type: 'poison',
        value: Math.floor(skillValue * 0.3),
        duration: 3,
      };
      if (skill.id.includes('fear') || skill.id.includes('curse')) {
        debuff.type = 'attack';
        debuff.value = Math.floor(skillValue * 0.2);
      }
      const target = selectTarget(enemies, 'single');
      if (target) {
        target.debuffs.push({ ...debuff });
        logEntry.targetId = target.id;
        logEntry.targetName = target.unit.name;
      }
      break;
    }
    case 'control': {
      const debuff: Debuff = {
        type: 'stun',
        value: 0,
        duration: skill.id.includes('trap') ? 2 : 1,
      };
      const target = selectTarget(enemies, 'single');
      if (target) {
        const targetStats = getEnemyEffectiveStats(target);
        const damage = calculateDamage(stats.attack, targetStats.defense, skillValue);
        target.currentHp -= damage;
        target.debuffs.push({ ...debuff });
        target.isControlled = true;
        attacker.totalDamageDealt += damage;
        logEntry.targetId = target.id;
        logEntry.targetName = target.unit.name;
        logEntry.damage = damage;
      }
      break;
    }
  }

  log.push(logEntry);

  enemies.forEach((enemy) => {
    if (enemy.currentHp <= 0) {
      enemy.isAlive = false;
    }
  });
};

const executeBasicAttack = (
  attacker: BattleCharacter,
  enemies: BattleEnemy[],
  log: BattleLogEntry[],
  round: number
): void => {
  const target = selectTarget(enemies, 'single');
  if (!target) return;

  const stats = getEffectiveStats(attacker);
  const targetStats = getEnemyEffectiveStats(target);
  const damage = calculateDamage(stats.attack, targetStats.defense, stats.attack * 0.5);
  
  target.currentHp -= damage;
  attacker.totalDamageDealt += damage;

  if (target.currentHp <= 0) {
    target.isAlive = false;
  }

  log.push({
    turn: round,
    actorId: attacker.id,
    actorName: attacker.template.name,
    action: '普通攻击',
    targetId: target.id,
    targetName: target.unit.name,
    damage,
  });
};

const executeEnemyTurn = (
  enemy: BattleEnemy,
  characters: BattleCharacter[],
  log: BattleLogEntry[],
  round: number
): void => {
  if (!enemy.isAlive || enemy.isControlled) return;

  const dotDamage = applyDebuffs(enemy);
  if (dotDamage > 0) {
    enemy.currentHp -= dotDamage;
    log.push({
      turn: round,
      actorId: enemy.id,
      actorName: enemy.unit.name,
      action: '中毒伤害',
      damage: dotDamage,
    });
    if (enemy.currentHp <= 0) {
      enemy.isAlive = false;
      return;
    }
  }

  const aliveChars = characters.filter((c) => c.isAlive);
  if (aliveChars.length === 0) return;

  const target = aliveChars[Math.floor(Math.random() * aliveChars.length)];
  const stats = getEnemyEffectiveStats(enemy);
  const targetStats = getEffectiveStats(target);
  const damage = calculateDamage(stats.attack, targetStats.defense, stats.attack);

  target.currentHp -= damage;

  log.push({
    turn: round,
    actorId: enemy.id,
    actorName: enemy.unit.name,
    action: '攻击',
    targetId: target.id,
    targetName: target.template.name,
    damage,
  });

  if (target.currentHp <= 0) {
    target.isAlive = false;
  }
};

const simulateSingleBattle = (
  characters: Character[],
  enemyGroup: EnemyGroup
): SingleBattleResult => {
  const battleChars = characters.map(initializeBattleCharacter);
  const battleEnemies = initializeBattleEnemies(enemyGroup);
  const log: BattleLogEntry[] = [];

  battleChars.forEach((char) => {
    char.template.skills.forEach((skill) => {
      if (skill.type === 'passive' && skill.id.includes('battle_cry')) {
        const allocation = getSkillAllocation(skill.id, char.skillAllocations);
        if (allocation && allocation.level > 0) {
          const value = getSkillValue(skill, allocation);
          battleChars.forEach((c) => {
            c.buffs.push({ type: 'attack', value, duration: MAX_ROUNDS });
          });
        }
      }
      if (skill.type === 'passive' && skill.id.includes('holy_aura')) {
        const allocation = getSkillAllocation(skill.id, char.skillAllocations);
        if (allocation && allocation.level > 0) {
          const value = getSkillValue(skill, allocation);
          battleChars.forEach((c) => {
            c.buffs.push({ type: 'defense', value, duration: MAX_ROUNDS });
          });
        }
      }
      if (skill.type === 'passive' && skill.id.includes('fear_aura')) {
        const allocation = getSkillAllocation(skill.id, char.skillAllocations);
        if (allocation && allocation.level > 0) {
          const value = getSkillValue(skill, allocation);
          battleEnemies.forEach((e) => {
            e.debuffs.push({ type: 'attack', value, duration: MAX_ROUNDS });
          });
        }
      }
    });
  });

  let round = 0;
  const characterDamage: Record<string, number> = {};
  const characterHealing: Record<string, number> = {};
  const skillUsage: Record<string, number> = {};

  while (round < MAX_ROUNDS) {
    round++;

    battleChars.forEach((char) => {
      if (char.isAlive) {
        applyDebuffs(char);
        applyBuffs(char);
        
        Object.keys(char.cooldowns).forEach((skillId) => {
          if (char.cooldowns[skillId] > 0) {
            char.cooldowns[skillId]--;
          }
        });
      }
    });

    const allEntities = [
      ...battleChars.filter((c) => c.isAlive).map((c) => ({ ...c, entityType: 'char' as const })),
      ...battleEnemies.filter((e) => e.isAlive).map((e) => ({ ...e, entityType: 'enemy' as const, speed: getEnemyEffectiveStats(e).speed })),
    ].sort((a, b) => b.speed - a.speed);

    for (const entity of allEntities) {
      const charsAlive = battleChars.some((c) => c.isAlive);
      const enemiesAlive = battleEnemies.some((e) => e.isAlive);
      
      if (!charsAlive || !enemiesAlive) break;

      if (entity.entityType === 'char') {
        const char = battleChars.find((c) => c.id === entity.id)!;
        if (!char.isAlive) continue;

        const isStunned = char.debuffs.some((d) => d.type === 'stun');
        if (isStunned) continue;

        const skill = selectBestSkill(char);
        if (skill) {
          executeSkill(char, skill, battleChars, battleEnemies, log, round);
        } else {
          executeBasicAttack(char, battleEnemies, log, round);
        }
      } else {
        const enemy = battleEnemies.find((e) => e.id === entity.id)!;
        executeEnemyTurn(enemy, battleChars, log, round);
      }
    }

    const charsAlive = battleChars.some((c) => c.isAlive);
    const enemiesAlive = battleEnemies.some((e) => e.isAlive);
    
    if (!charsAlive || !enemiesAlive) break;
  }

  const survivingCharacters = battleChars.filter((c) => c.isAlive).length;
  const enemiesKilled = battleEnemies.filter((e) => !e.isAlive).length;
  const victory = battleEnemies.every((e) => !e.isAlive) && battleChars.some((c) => c.isAlive);

  battleChars.forEach((char) => {
    characterDamage[char.id] = char.totalDamageDealt;
    characterHealing[char.id] = char.totalHealingDone;
    Object.entries(char.skillsUsed).forEach(([skillId, count]) => {
      skillUsage[skillId] = (skillUsage[skillId] || 0) + count;
    });
  });

  return {
    victory,
    survivingCharacters,
    enemiesKilled,
    rounds: round,
    characterDamage,
    characterHealing,
    skillUsage,
    log,
  };
};

export const runSimulation = async (
  characters: Character[],
  enemyGroups: EnemyGroup[],
  onProgress: (progress: number) => void
): Promise<BattleStatistics> => {
  if (characters.length === 0) {
    throw new Error('请至少选择一个角色');
  }

  const results: SingleBattleResult[] = [];
  let wins = 0;
  let maxSingleDamage = 0;
  const totalDamageByClass: Record<CharacterClass, number> = {
    warrior: 0, mage: 0, assassin: 0, priest: 0, ranger: 0, warlock: 0,
  };
  const skillUsageFrequency: Record<string, number> = {};
  const survivalRounds: number[] = [];

  const batchSize = 50;
  for (let i = 0; i < TOTAL_BATTLES; i += batchSize) {
    const end = Math.min(i + batchSize, TOTAL_BATTLES);
    
    for (let j = i; j < end; j++) {
      const enemyGroup = enemyGroups[Math.floor(Math.random() * enemyGroups.length)];
      const result = simulateSingleBattle(characters, enemyGroup);
      results.push(result);

      if (result.victory) wins++;
      survivalRounds.push(result.rounds);

      characters.forEach((char) => {
        const damage = result.characterDamage[char.id] || 0;
        totalDamageByClass[char.template.class] += damage;
        if (damage > maxSingleDamage) maxSingleDamage = damage;
      });

      Object.entries(result.skillUsage).forEach(([skillId, count]) => {
        skillUsageFrequency[skillId] = (skillUsageFrequency[skillId] || 0) + count;
      });
    }

    const progress = Math.min(100, Math.round((end / TOTAL_BATTLES) * 100));
    onProgress(progress);
    
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const totalDamage = Object.values(totalDamageByClass).reduce((sum, d) => sum + d, 0);
  const classDamagePercentage = Object.entries(totalDamageByClass)
    .filter(([, damage]) => damage > 0)
    .map(([charClass, damage]) => ({
      class: charClass as CharacterClass,
      name: AVAILABLE_CLASSES.find((c) => c.class === charClass)?.name || charClass,
      value: Math.round((damage / totalDamage) * 100),
      color: CLASS_COLORS[charClass as CharacterClass],
    }))
    .sort((a, b) => b.value - a.value);

  const allSkills = characters.flatMap((c) => c.template.skills);
  const topSkills = Object.entries(skillUsageFrequency)
    .map(([skillId, count]) => {
      const skill = allSkills.find((s) => s.id === skillId);
      const char = characters.find((c) => c.template.skills.some((s) => s.id === skillId));
      return {
        name: skill?.name || skillId,
        count,
        class: char?.template.class || 'warrior' as CharacterClass,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const avgSurvivalRounds = survivalRounds.reduce((sum, r) => sum + r, 0) / survivalRounds.length;

  return {
    totalBattles: TOTAL_BATTLES,
    wins,
    winRate: Math.round((wins / TOTAL_BATTLES) * 10000) / 100,
    avgSurvivalRounds: Math.round(avgSurvivalRounds * 100) / 100,
    maxSingleDamage,
    totalDamageByClass,
    skillUsageFrequency,
    survivalRounds,
    battleResults: results,
    classDamagePercentage,
    topSkills,
  };
};
