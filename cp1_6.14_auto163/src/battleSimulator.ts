import { Skill } from './skillTree';

export interface Enemy {
  id: string;
  name: string;
  icon: string;
  bgColor: string;
  maxHp: number;
  hp: number;
  defense: number;
  attack: number;
}

export interface PlayerState {
  maxHp: number;
  hp: number;
  defense: number;
  baseAttack: number;
}

export interface EquippedSkill {
  skill: Skill;
  level: number;
  cooldownRemaining: number;
}

export interface BattleLogEntry {
  turn: number;
  actor: 'player' | 'enemy';
  skillName?: string;
  damage?: number;
  heal?: number;
  message: string;
  timestamp: number;
}

export interface BattleStats {
  totalTurns: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  skillUsage: Record<string, number>;
  skillDamage: Record<string, number>;
  victory: boolean;
}

export interface BattleState {
  player: PlayerState;
  enemy: Enemy;
  equippedSkills: EquippedSkill[];
  logs: BattleLogEntry[];
  stats: BattleStats;
  isFinished: boolean;
  turn: number;
}

export const ENEMIES: Enemy[] = [
  {
    id: 'slime',
    name: '史莱姆',
    icon: '🟢',
    bgColor: '#27ae60',
    maxHp: 150,
    hp: 150,
    defense: 5,
    attack: 12,
  },
  {
    id: 'goblin',
    name: '哥布林',
    icon: '👺',
    bgColor: '#8b4513',
    maxHp: 250,
    hp: 250,
    defense: 15,
    attack: 25,
  },
  {
    id: 'skeleton',
    name: '骷髅兵',
    icon: '💀',
    bgColor: '#95a5a6',
    maxHp: 350,
    hp: 350,
    defense: 25,
    attack: 35,
  },
];

const MAX_TURNS = 20;

export const calculateDamage = (baseDamage: number, targetDefense: number): number => {
  const damage = Math.max(1, baseDamage - Math.floor(targetDefense * 0.5));
  const variance = damage * 0.1;
  return Math.round(damage + (Math.random() * variance * 2 - variance));
};

export const getEnemyById = (id: string): Enemy | undefined => {
  return ENEMIES.find((e) => e.id === id);
};

export const createBattleState = (
  enemy: Enemy,
  equippedSkills: { skill: Skill; level: number }[],
): BattleState => {
  return {
    player: {
      maxHp: 500,
      hp: 500,
      defense: 10,
      baseAttack: 10,
    },
    enemy: { ...enemy, hp: enemy.maxHp },
    equippedSkills: equippedSkills.map((es) => ({
      ...es,
      cooldownRemaining: 0,
    })),
    logs: [],
    stats: {
      totalTurns: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      skillUsage: {},
      skillDamage: {},
      victory: false,
    },
    isFinished: false,
    turn: 0,
  };
};

export const runBattleSimulation = (
  initialState: BattleState,
): BattleLogEntry[] => {
  const state: BattleState = JSON.parse(JSON.stringify(initialState));
  const logs: BattleLogEntry[] = [];
  let defenseBuffTurns = 0;
  let activeDefenseBuff = 0;
  let timestamp = Date.now();

  const addLog = (entry: Omit<BattleLogEntry, 'timestamp'>) => {
    timestamp += 10;
    logs.push({ ...entry, timestamp });
  };

  for (state.turn = 1; state.turn <= MAX_TURNS; state.turn++) {
    addLog({
      turn: state.turn,
      actor: 'player',
      message: `=== 第 ${state.turn} 回合 ===`,
    });

    const availableSkills = state.equippedSkills.filter(
      (s) => s.cooldownRemaining === 0,
    );

    if (availableSkills.length > 0) {
      const skillToUse = availableSkills.reduce((best, current) => {
        const bestEffect = best.skill.effects[best.level - 1];
        const currentEffect = current.skill.effects[current.level - 1];
        const bestPower = (bestEffect.damage || 0) + (bestEffect.heal || 0) * 0.5;
        const currentPower = (currentEffect.damage || 0) + (currentEffect.heal || 0) * 0.5;
        return currentPower > bestPower ? current : best;
      });

      const effect = skillToUse.skill.effects[skillToUse.level - 1];
      const skillId = skillToUse.skill.id;

      state.stats.skillUsage[skillId] = (state.stats.skillUsage[skillId] || 0) + 1;

      if (effect.damage) {
        const damage = calculateDamage(effect.damage, state.enemy.defense);
        state.enemy.hp = Math.max(0, state.enemy.hp - damage);
        state.stats.totalDamageDealt += damage;
        state.stats.skillDamage[skillId] = (state.stats.skillDamage[skillId] || 0) + damage;

        if (skillToUse.skill.id === 'w3') {
          const selfDamage = [10, 15, 20][skillToUse.level - 1];
          state.player.hp = Math.max(0, state.player.hp - selfDamage);
          state.stats.totalDamageTaken += selfDamage;
          addLog({
            turn: state.turn,
            actor: 'player',
            skillName: skillToUse.skill.name,
            damage: damage,
            message: `玩家使用【${skillToUse.skill.name}】对${state.enemy.name}造成 ${damage} 点伤害，自身受到 ${selfDamage} 点反噬伤害！`,
          });
        } else {
          addLog({
            turn: state.turn,
            actor: 'player',
            skillName: skillToUse.skill.name,
            damage: damage,
            message: `玩家使用【${skillToUse.skill.name}】对${state.enemy.name}造成 ${damage} 点伤害！`,
          });
        }
      }

      if (effect.heal) {
        const healAmount = effect.heal;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
        addLog({
          turn: state.turn,
          actor: 'player',
          skillName: skillToUse.skill.name,
          heal: healAmount,
          message: `玩家使用【${skillToUse.skill.name}】回复了 ${healAmount} 点生命值！`,
        });
      }

      if (effect.defense) {
        activeDefenseBuff = effect.defense;
        defenseBuffTurns = effect.cooldown || 2;
        addLog({
          turn: state.turn,
          actor: 'player',
          skillName: skillToUse.skill.name,
          message: `玩家使用【${skillToUse.skill.name}】，防御力提升 ${effect.defense} 点！`,
        });
      }

      skillToUse.cooldownRemaining = effect.cooldown || 0;
    } else {
      const basicDamage = calculateDamage(state.player.baseAttack, state.enemy.defense);
      state.enemy.hp = Math.max(0, state.enemy.hp - basicDamage);
      state.stats.totalDamageDealt += basicDamage;
      addLog({
        turn: state.turn,
        actor: 'player',
        damage: basicDamage,
        message: `玩家使用普通攻击，对${state.enemy.name}造成 ${basicDamage} 点伤害！`,
      });
    }

    addLog({
      turn: state.turn,
      actor: 'player',
      message: `${state.enemy.name}剩余HP: ${state.enemy.hp} / ${state.enemy.maxHp}`,
    });

    if (state.enemy.hp <= 0) {
      state.stats.victory = true;
      addLog({
        turn: state.turn,
        actor: 'player',
        message: `🎉 胜利！${state.enemy.name}被击败了！`,
      });
      break;
    }

    state.equippedSkills.forEach((s) => {
      if (s.cooldownRemaining > 0) s.cooldownRemaining--;
    });

    const totalPlayerDefense = state.player.defense + (defenseBuffTurns > 0 ? activeDefenseBuff : 0);
    const enemyDamage = calculateDamage(state.enemy.attack, totalPlayerDefense);
    state.player.hp = Math.max(0, state.player.hp - enemyDamage);
    state.stats.totalDamageTaken += enemyDamage;

    addLog({
      turn: state.turn,
      actor: 'enemy',
      damage: enemyDamage,
      message: `${state.enemy.name}攻击玩家，造成 ${enemyDamage} 点伤害！`,
    });

    addLog({
      turn: state.turn,
      actor: 'enemy',
      message: `玩家剩余HP: ${state.player.hp} / ${state.player.maxHp}`,
    });

    if (defenseBuffTurns > 0) {
      defenseBuffTurns--;
      if (defenseBuffTurns === 0) {
        addLog({
          turn: state.turn,
          actor: 'player',
          message: '防御增益效果已消失。',
        });
      }
    }

    if (state.player.hp <= 0) {
      state.stats.victory = false;
      addLog({
        turn: state.turn,
        actor: 'enemy',
        message: `💀 失败！玩家被${state.enemy.name}击败了...`,
      });
      break;
    }
  }

  state.stats.totalTurns = state.turn;

  if (state.turn > MAX_TURNS) {
    addLog({
      turn: MAX_TURNS,
      actor: 'player',
      message: '⏱️ 战斗超时，超过最大回合数限制！',
    });
  }

  return logs;
};

export const getFullBattleResult = (
  initialState: BattleState,
): { logs: BattleLogEntry[]; stats: BattleStats; finalState: BattleState } => {
  const state: BattleState = JSON.parse(JSON.stringify(initialState));
  const logs = runBattleSimulation(state);
  const lastLog = logs[logs.length - 1];
  const victory = lastLog?.message.includes('胜利') || false;

  let finalPlayerHp = state.player.maxHp;
  let finalEnemyHp = state.enemy.maxHp;

  logs.forEach((log) => {
    if (log.actor === 'player' && log.skillName) {
      if (log.damage) finalEnemyHp = Math.max(0, finalEnemyHp - log.damage);
      if (log.heal) finalPlayerHp = Math.min(state.player.maxHp, finalPlayerHp + log.heal);
    } else if (log.actor === 'enemy' && log.damage) {
      finalPlayerHp = Math.max(0, finalPlayerHp - log.damage);
    }
  });

  state.player.hp = finalPlayerHp;
  state.enemy.hp = finalEnemyHp;
  state.stats.victory = victory;
  state.stats.totalTurns = state.turn;
  state.isFinished = true;

  return { logs, stats: state.stats, finalState: state };
};
