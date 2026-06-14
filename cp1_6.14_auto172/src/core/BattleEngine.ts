import { v4 as uuidv4 } from 'uuid';
import {
  CharacterConfig,
  BattleCharacter,
  BattleAction,
  BattleResult,
  getSkillById,
} from '@/configs/CharacterConfig';
import {
  calculateSkillEffect,
  calculateBasicAttackDamage,
  applyDamage,
  applyHeal,
  processTurnStartEffects,
} from './SkillEffect';

const MAX_TURNS = 20;

const createBattleCharacter = (config: CharacterConfig): BattleCharacter => ({
  id: config.id,
  name: config.name,
  currentHp: config.stats.maxHp,
  maxHp: config.stats.maxHp,
  baseAttack: config.stats.attack,
  baseDefense: config.stats.defense,
  skillIds: [...config.skillIds],
  skillCooldowns: config.skillIds.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Record<string, number>),
  buffs: [],
  dots: [],
  shield: null,
});

const selectAvailableSkill = (char: BattleCharacter): string | null => {
  const available = char.skillIds.filter((id) => char.skillCooldowns[id] === 0);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
};

const decideAction = (char: BattleCharacter): 'skill' | 'attack' => {
  const skillId = selectAvailableSkill(char);
  if (!skillId) return 'attack';

  const hpPercent = char.currentHp / char.maxHp;
  const skill = getSkillById(skillId);

  if (skill?.effectType === 'heal' && hpPercent < 0.6) {
    return 'skill';
  }

  if (skill?.effectType === 'shield' && hpPercent < 0.7 && !char.shield) {
    return 'skill';
  }

  if (skill?.effectType === 'attack_buff' && char.buffs.filter(b => b.type === 'attack_buff').length === 0) {
    return Math.random() < 0.7 ? 'skill' : 'attack';
  }

  return Math.random() < 0.6 ? 'skill' : 'attack';
};

export const runSingleBattle = (
  char1Config: CharacterConfig,
  char2Config: CharacterConfig
): BattleResult => {
  const char1 = createBattleCharacter(char1Config);
  const char2 = createBattleCharacter(char2Config);
  const actions: BattleAction[] = [];
  const skillUsage: Record<string, number> = {};

  let turn = 1;
  let winner: BattleCharacter | null = null;

  while (turn <= MAX_TURNS) {
    const char1Dot = processTurnStartEffects(char1);
    const char2Dot = processTurnStartEffects(char2);

    if (char1Dot > 0) {
      actions.push({
        turn,
        attackerId: 'dot',
        attackerName: '燃烧',
        targetId: char1.id,
        targetName: char1.name,
        actionType: 'attack',
        damage: char1Dot,
      });
    }
    if (char2Dot > 0) {
      actions.push({
        turn,
        attackerId: 'dot',
        attackerName: '燃烧',
        targetId: char2.id,
        targetName: char2.name,
        actionType: 'attack',
        damage: char2Dot,
      });
    }

    if (char1.currentHp <= 0 && char2.currentHp <= 0) {
      break;
    }
    if (char1.currentHp <= 0) {
      winner = char2;
      break;
    }
    if (char2.currentHp <= 0) {
      winner = char1;
      break;
    }

    const attackers: { attacker: BattleCharacter; target: BattleCharacter }[] = [
      { attacker: char1, target: char2 },
      { attacker: char2, target: char1 },
    ];

    for (const { attacker, target } of attackers) {
      if (attacker.currentHp <= 0 || target.currentHp <= 0) continue;

      const actionType = decideAction(attacker);

      if (actionType === 'skill') {
        const skillId = selectAvailableSkill(attacker);
        if (skillId) {
          const skill = getSkillById(skillId);
          if (skill) {
            const effect = calculateSkillEffect(skill, attacker, target);

            const action: BattleAction = {
              turn,
              attackerId: attacker.id,
              attackerName: attacker.name,
              targetId: skill.effectType === 'heal' || skill.effectType === 'shield' || skill.effectType === 'attack_buff' || skill.effectType === 'defense_buff'
                ? attacker.id
                : target.id,
              targetName: skill.effectType === 'heal' || skill.effectType === 'shield' || skill.effectType === 'attack_buff' || skill.effectType === 'defense_buff'
                ? attacker.name
                : target.name,
              actionType: 'skill',
              skillId: skill.id,
              skillName: skill.name,
            };

            if (effect.damage) {
              applyDamage(target, effect.damage);
              action.damage = effect.damage;
            }
            if (effect.heal) {
              applyHeal(attacker, effect.heal);
              action.heal = effect.heal;
            }
            if (effect.shieldValue) {
              attacker.shield = {
                value: effect.shieldValue,
                remainingTurns: skill.duration || 3,
              };
              action.effectApplied = `护盾 ${effect.shieldValue}`;
            }
            if (effect.buff) {
              const buffTarget = skill.effectType === 'attack_buff' || skill.effectType === 'defense_buff' ? attacker : target;
              buffTarget.buffs.push({ ...effect.buff });
              action.effectApplied = effect.effectName;
            }
            if (effect.dot) {
              target.dots.push({ ...effect.dot });
              action.effectApplied = effect.effectName;
            }

            actions.push(action);
            skillUsage[skillId] = (skillUsage[skillId] || 0) + 1;
            attacker.skillCooldowns[skillId] = skill.cooldown;
          }
        }
      } else {
        const damage = calculateBasicAttackDamage(attacker, target);
        applyDamage(target, damage);
        actions.push({
          turn,
          attackerId: attacker.id,
          attackerName: attacker.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'attack',
          damage,
        });
      }

      if (target.currentHp <= 0) {
        winner = attacker;
        break;
      }
    }

    if (winner) break;
    turn++;
  }

  return {
    battleId: uuidv4(),
    winnerId: winner?.id || null,
    winnerName: winner?.name || null,
    isDraw: !winner,
    totalTurns: turn > MAX_TURNS ? MAX_TURNS : turn,
    character1FinalHp: char1.currentHp,
    character2FinalHp: char2.currentHp,
    actions,
    skillUsage,
  };
};

export const runMultipleBattles = (
  char1Config: CharacterConfig,
  char2Config: CharacterConfig,
  battleCount: number = 30
): BattleResult[] => {
  const results: BattleResult[] = [];
  for (let i = 0; i < battleCount; i++) {
    results.push(runSingleBattle(char1Config, char2Config));
  }
  return results;
};
