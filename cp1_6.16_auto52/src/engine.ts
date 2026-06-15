import { v4 as uuidv4 } from 'uuid';

export type HeroClass = 'warrior' | 'mage' | 'assassin' | 'priest';
export type SkillType = 'physical' | 'magic' | 'heal' | 'buff' | 'debuff';
export type LogType = 'attack' | 'heal' | 'buff' | 'debuff' | 'system';
export type EnemyTemplate = 'goblin' | 'skeleton' | 'dark_elf' | 'golem' | 'dragon';
export type Side = 'hero' | 'enemy';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  mpCost: number;
  cooldown: number;
  value: number;
}

export interface Buff {
  type: 'atk' | 'def' | 'spd';
  value: number;
  turns: number;
  sourceId: string;
}

export interface Debuff {
  type: 'atk' | 'def' | 'spd';
  value: number;
  turns: number;
  sourceId: string;
}

export interface UnitStats {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  kills: number;
  survivedTurns: number;
  lastHealedBy?: string;
}

export interface Unit {
  id: string;
  name: string;
  side: Side;
  class?: HeroClass;
  template?: EnemyTemplate;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  skills: Skill[];
  buffs: Buff[];
  debuffs: Debuff[];
  cooldowns: Record<string, number>;
  alive: boolean;
  stats: UnitStats;
}

export interface BattleLog {
  id: string;
  turn: number;
  timestamp: number;
  type: LogType;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  skillName?: string;
  value?: number;
  message: string;
}

export interface BattleResult {
  winner: Side | 'draw';
  totalTurns: number;
  heroes: Unit[];
  enemies: Unit[];
  logs: BattleLog[];
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand: () => number, min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randomFloat(rand: () => number, min: number, max: number) {
  return rand() * (max - min) + min;
}

function makeLog(
  turn: number,
  type: LogType,
  actor: Unit,
  target?: Unit,
  skillName?: string,
  value?: number,
  message?: string
): BattleLog {
  const msg =
    message ||
    (type === 'attack'
      ? `${actor.name}${skillName ? `使用【${skillName}】` : '普通攻击'}对${target?.name}造成${value}点伤害`
      : type === 'heal'
      ? `${actor.name}${skillName ? `使用【${skillName}】` : ''}为${target?.name}恢复${value}点生命`
      : type === 'buff'
      ? `${actor.name}${skillName ? `使用【${skillName}】` : ''}为${target?.name}施加增益效果`
      : type === 'debuff'
      ? `${actor.name}${skillName ? `使用【${skillName}】` : ''}对${target?.name}施加减益效果`
      : `${actor.name} ${message}`);
  return {
    id: uuidv4(),
    turn,
    timestamp: Date.now(),
    type,
    actorId: actor.id,
    actorName: actor.name,
    targetId: target?.id,
    targetName: target?.name,
    skillName,
    value,
    message: msg
  };
}

export function createHero(config: {
  id?: string;
  name: string;
  class: HeroClass;
  maxHp?: number;
  hp?: number;
  maxMp?: number;
  mp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  skills?: Skill[];
}): Unit {
  const classDefaults: Record<HeroClass, Partial<Unit>> = {
    warrior: { maxHp: 400, maxMp: 50, atk: 35, def: 25, spd: 5 },
    mage: { maxHp: 250, maxMp: 150, atk: 40, def: 10, spd: 6 },
    assassin: { maxHp: 280, maxMp: 80, atk: 45, def: 12, spd: 9 },
    priest: { maxHp: 300, maxMp: 120, atk: 20, def: 15, spd: 4 }
  };
  const defaults = classDefaults[config.class];
  const defaultSkills: Record<HeroClass, Skill[]> = {
    warrior: [
      { id: uuidv4(), name: '重击', type: 'physical', mpCost: 10, cooldown: 1, value: 50 },
      { id: uuidv4(), name: '战吼', type: 'buff', mpCost: 15, cooldown: 3, value: 30 },
      { id: uuidv4(), name: '旋风斩', type: 'physical', mpCost: 20, cooldown: 2, value: 70 }
    ],
    mage: [
      { id: uuidv4(), name: '火球术', type: 'magic', mpCost: 15, cooldown: 0, value: 60 },
      { id: uuidv4(), name: '冰霜新星', type: 'magic', mpCost: 25, cooldown: 2, value: 90 },
      { id: uuidv4(), name: '奥术强化', type: 'buff', mpCost: 20, cooldown: 3, value: 40 }
    ],
    assassin: [
      { id: uuidv4(), name: '毒刃', type: 'physical', mpCost: 8, cooldown: 0, value: 55 },
      { id: uuidv4(), name: '暗影打击', type: 'physical', mpCost: 18, cooldown: 1, value: 85 },
      { id: uuidv4(), name: '破甲', type: 'debuff', mpCost: 15, cooldown: 2, value: 40 }
    ],
    priest: [
      { id: uuidv4(), name: '治愈术', type: 'heal', mpCost: 12, cooldown: 0, value: 60 },
      { id: uuidv4(), name: '神圣护盾', type: 'buff', mpCost: 20, cooldown: 2, value: 35 },
      { id: uuidv4(), name: '圣光审判', type: 'magic', mpCost: 22, cooldown: 2, value: 75 }
    ]
  };

  const maxHp = config.maxHp ?? defaults.maxHp!;
  const maxMp = config.maxMp ?? defaults.maxMp!;

  return {
    id: config.id || uuidv4(),
    name: config.name,
    side: 'hero',
    class: config.class,
    maxHp,
    hp: config.hp ?? maxHp,
    maxMp,
    mp: config.mp ?? maxMp,
    atk: config.atk ?? defaults.atk!,
    def: config.def ?? defaults.def!,
    spd: config.spd ?? defaults.spd!,
    skills: config.skills ?? defaultSkills[config.class],
    buffs: [],
    debuffs: [],
    cooldowns: {},
    alive: true,
    stats: {
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
      survivedTurns: 0
    }
  };
}

export function createEnemy(
  template: EnemyTemplate,
  overrides?: Partial<Unit> & { name?: string }
): Unit {
  const templates: Record<EnemyTemplate, Partial<Unit> & { name: string }> = {
    goblin: { name: '哥布林', maxHp: 80, maxMp: 30, atk: 15, def: 5, spd: 7 },
    skeleton: { name: '骷髅', maxHp: 120, maxMp: 40, atk: 18, def: 8, spd: 5 },
    dark_elf: { name: '暗精灵', maxHp: 100, maxMp: 60, atk: 25, def: 6, spd: 9 },
    golem: { name: '石头人', maxHp: 250, maxMp: 20, atk: 20, def: 20, spd: 2 },
    dragon: { name: 'Boss龙', maxHp: 500, maxMp: 100, atk: 40, def: 25, spd: 6 }
  };
  const def = templates[template];
  const defaultSkills: Record<EnemyTemplate, Skill[]> = {
    goblin: [
      { id: uuidv4(), name: '猛刺', type: 'physical', mpCost: 5, cooldown: 1, value: 25 },
      { id: uuidv4(), name: '撕咬', type: 'physical', mpCost: 0, cooldown: 0, value: 15 },
      { id: uuidv4(), name: '破甲嚎叫', type: 'debuff', mpCost: 10, cooldown: 3, value: 25 }
    ],
    skeleton: [
      { id: uuidv4(), name: '骨刺', type: 'physical', mpCost: 8, cooldown: 1, value: 30 },
      { id: uuidv4(), name: '死亡诅咒', type: 'debuff', mpCost: 15, cooldown: 2, value: 30 },
      { id: uuidv4(), name: '冷箭', type: 'magic', mpCost: 5, cooldown: 0, value: 22 }
    ],
    dark_elf: [
      { id: uuidv4(), name: '暗影箭', type: 'magic', mpCost: 12, cooldown: 0, value: 45 },
      { id: uuidv4(), name: '精灵诅咒', type: 'debuff', mpCost: 18, cooldown: 2, value: 35 },
      { id: uuidv4(), name: '吸血之触', type: 'magic', mpCost: 20, cooldown: 2, value: 50 }
    ],
    golem: [
      { id: uuidv4(), name: '岩石粉碎', type: 'physical', mpCost: 10, cooldown: 2, value: 55 },
      { id: uuidv4(), name: '地震', type: 'physical', mpCost: 15, cooldown: 3, value: 40 },
      { id: uuidv4(), name: '石甲', type: 'buff', mpCost: 10, cooldown: 3, value: 50 }
    ],
    dragon: [
      { id: uuidv4(), name: '龙息', type: 'magic', mpCost: 20, cooldown: 1, value: 80 },
      { id: uuidv4(), name: '龙爪撕裂', type: 'physical', mpCost: 15, cooldown: 0, value: 60 },
      { id: uuidv4(), name: '毁灭之怒', type: 'magic', mpCost: 30, cooldown: 3, value: 120 }
    ]
  };

  const maxHp = overrides?.maxHp ?? def.maxHp!;
  const maxMp = overrides?.maxMp ?? def.maxMp!;

  return {
    id: overrides?.id || uuidv4(),
    name: overrides?.name ?? def.name,
    side: 'enemy',
    template,
    maxHp,
    hp: overrides?.hp ?? maxHp,
    maxMp,
    mp: overrides?.mp ?? maxMp,
    atk: overrides?.atk ?? def.atk!,
    def: overrides?.def ?? def.def!,
    spd: overrides?.spd ?? def.spd!,
    skills: overrides?.skills ?? defaultSkills[template],
    buffs: [],
    debuffs: [],
    cooldowns: {},
    alive: true,
    stats: {
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
      survivedTurns: 0
    }
  };
}

export function cloneUnits(units: Unit[]): Unit[] {
  return units.map((u) => ({
    ...u,
    skills: u.skills.map((s) => ({ ...s })),
    buffs: u.buffs.map((b) => ({ ...b })),
    debuffs: u.debuffs.map((d) => ({ ...d })),
    cooldowns: { ...u.cooldowns },
    stats: { ...u.stats }
  }));
}

function effectiveAtk(unit: Unit): number {
  let mul = 1;
  for (const b of unit.buffs) if (b.type === 'atk') mul += b.value / 100;
  for (const d of unit.debuffs) if (d.type === 'atk') mul -= d.value / 100;
  return Math.max(1, unit.atk * mul);
}

function effectiveDef(unit: Unit): number {
  let mul = 1;
  for (const b of unit.buffs) if (b.type === 'def') mul += b.value / 100;
  for (const d of unit.debuffs) if (d.type === 'def') mul -= d.value / 100;
  return Math.max(0, unit.def * mul);
}

function effectiveSpd(unit: Unit): number {
  let mul = 1;
  for (const b of unit.buffs) if (b.type === 'spd') mul += b.value / 100;
  for (const d of unit.debuffs) if (b.type === 'spd') mul -= d.value / 100;
  return Math.max(1, unit.spd * mul);
}

function findLowestHpUnit(units: Unit[], excludeDead = true): Unit | null {
  const alive = units.filter((u) => !excludeDead || u.alive);
  if (alive.length === 0) return null;
  return alive.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
}

function findRandomUnit(units: Unit[], rand: () => number, excludeDead = true): Unit | null {
  const alive = units.filter((u) => !excludeDead || u.alive);
  if (alive.length === 0) return null;
  return alive[randomInt(rand, 0, alive.length - 1)];
}

function findLowestHpAllyWithThreshold(allies: Unit[], threshold: number): Unit | null {
  const candidates = allies.filter((u) => u.alive && u.hp / u.maxHp < threshold);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
}

function tickBuffsAndDebuffs(unit: Unit) {
  unit.buffs = unit.buffs
    .map((b) => ({ ...b, turns: b.turns - 1 }))
    .filter((b) => b.turns > 0);
  unit.debuffs = unit.debuffs
    .map((d) => ({ ...d, turns: d.turns - 1 }))
    .filter((d) => d.turns > 0);
}

function tickCooldowns(unit: Unit) {
  for (const k of Object.keys(unit.cooldowns)) {
    if (unit.cooldowns[k] > 0) unit.cooldowns[k] -= 1;
  }
}

function getAvailableSkills(unit: Unit): Skill[] {
  return unit.skills.filter(
    (s) => (unit.cooldowns[s.id] || 0) === 0 && unit.mp >= s.mpCost
  );
}

function calcPhysicalDamage(actorAtk: number, skillValue: number, targetDef: number, rand: () => number): number {
  const base = actorAtk * (skillValue / 50) - targetDef * 0.5;
  return Math.max(1, Math.round(base * randomFloat(rand, 0.9, 1.1)));
}

function calcMagicDamage(actorAtk: number, skillValue: number, targetDef: number, rand: () => number): number {
  const base = actorAtk * (skillValue / 50) - targetDef * 0.3;
  return Math.max(1, Math.round(base * randomFloat(rand, 0.85, 1.15)));
}

function calcHeal(value: number, rand: () => number): number {
  return Math.max(1, Math.round(value * randomFloat(rand, 0.95, 1.05)));
}

function applyDamage(target: Unit, damage: number, attacker: Unit) {
  target.hp = Math.max(0, target.hp - damage);
  target.stats.damageTaken += damage;
  if (target.hp === 0) {
    target.alive = false;
    attacker.stats.kills += 1;
  }
}

function applyHeal(target: Unit, amount: number, healer: Unit) {
  const realHeal = Math.min(amount, target.maxHp - target.hp);
  target.hp += realHeal;
  healer.stats.healingDone += realHeal;
  target.stats.lastHealedBy = healer.id;
}

function applyBuff(target: Unit, type: 'atk' | 'def' | 'spd', value: number, source: Unit, turns = 3) {
  target.buffs = target.buffs.filter((b) => b.type !== type || b.sourceId !== source.id);
  target.buffs.push({ type, value, turns, sourceId: source.id });
}

function applyDebuff(target: Unit, type: 'atk' | 'def' | 'spd', value: number, source: Unit, turns = 3) {
  target.debuffs = target.debuffs.filter((d) => d.type !== type || d.sourceId !== source.id);
  target.debuffs.push({ type, value, turns, sourceId: source.id });
}

function checkBattleEnd(heroes: Unit[], enemies: Unit[]): Side | 'draw' | null {
  const heroAlive = heroes.some((h) => h.alive);
  const enemyAlive = enemies.some((e) => e.alive);
  if (!heroAlive && !enemyAlive) return 'draw';
  if (!heroAlive) return 'enemy';
  if (!enemyAlive) return 'hero';
  return null;
}

function decideEnemyAction(
  unit: Unit,
  allies: Unit[],
  enemies: Unit[],
  rand: () => number
): { skill: Skill | null; target: Unit | null } {
  const available = getAvailableSkills(unit);
  const useSkill = available.length > 0 && rand() < 0.3;

  if (useSkill && available.length > 0) {
    const skill = available[randomInt(rand, 0, available.length - 1)];
    let target: Unit | null = null;
    if (skill.type === 'heal' || skill.type === 'buff') {
      target = findLowestHpUnit(allies);
    } else if (skill.type === 'debuff') {
      target = findRandomUnit(enemies, rand);
    } else {
      target = findLowestHpUnit(enemies);
    }
    return { skill, target };
  }

  let target: Unit | null = null;
  const taunted = enemies.filter((e) => e.alive && e.stats.lastHealedBy);
  if (taunted.length > 0) {
    target = findLowestHpUnit(taunted);
  }
  if (!target) {
    target = findLowestHpUnit(enemies);
  }
  return { skill: null, target };
}

function decideHeroAction(
  unit: Unit,
  allies: Unit[],
  enemies: Unit[],
  rand: () => number
): { skill: Skill | null; target: Unit | null } {
  const available = getAvailableSkills(unit);
  const klass = unit.class;

  if (klass === 'priest') {
    const healSkill = available.find((s) => s.type === 'heal');
    const injured = findLowestHpAllyWithThreshold(allies, 0.6);
    if (healSkill && injured) {
      return { skill: healSkill, target: injured };
    }
    const buffSkill = available.find((s) => s.type === 'buff');
    const lowest = findLowestHpUnit(allies);
    if (buffSkill && lowest && lowest.hp / lowest.maxHp < 0.8) {
      return { skill: buffSkill, target: lowest };
    }
    const dmgSkill = available.find((s) => s.type === 'magic' || s.type === 'physical');
    if (dmgSkill) {
      return { skill: dmgSkill, target: findLowestHpUnit(enemies) };
    }
    return { skill: null, target: findLowestHpUnit(enemies) };
  }

  if (klass === 'mage') {
    const magicSkill = available
      .filter((s) => s.type === 'magic')
      .sort((a, b) => b.value - a.value)[0];
    if (magicSkill) {
      return { skill: magicSkill, target: findLowestHpUnit(enemies) };
    }
    const buffSkill = available.find((s) => s.type === 'buff');
    if (buffSkill && unit.buffs.length === 0) {
      return { skill: buffSkill, target: unit };
    }
    return { skill: null, target: findLowestHpUnit(enemies) };
  }

  if (klass === 'warrior') {
    const physSkill = available
      .filter((s) => s.type === 'physical')
      .sort((a, b) => b.value - a.value)[0];
    if (physSkill) {
      return { skill: physSkill, target: findLowestHpUnit(enemies) };
    }
    const buffSkill = available.find((s) => s.type === 'buff');
    if (buffSkill && unit.buffs.length === 0) {
      return { skill: buffSkill, target: unit };
    }
    return { skill: null, target: findLowestHpUnit(enemies) };
  }

  if (klass === 'assassin') {
    const physSkill = available
      .filter((s) => s.type === 'physical')
      .sort((a, b) => b.value - a.value)[0];
    if (physSkill) {
      return { skill: physSkill, target: findLowestHpUnit(enemies) };
    }
    const debuffSkill = available.find((s) => s.type === 'debuff');
    if (debuffSkill) {
      return { skill: debuffSkill, target: findHighestThreat(enemies) };
    }
    return { skill: null, target: findLowestHpUnit(enemies) };
  }

  return { skill: null, target: findLowestHpUnit(enemies) };
}

function findHighestThreat(enemies: Unit[]): Unit | null {
  const alive = enemies.filter((e) => e.alive);
  if (alive.length === 0) return null;
  return alive.reduce((a, b) => (a.atk >= b.atk ? a : b));
}

function executeAction(
  actor: Unit,
  skill: Skill | null,
  target: Unit | null,
  turn: number,
  logs: BattleLog[],
  rand: () => number
) {
  if (!target || !target.alive) return;

  if (skill) {
    actor.mp -= skill.mpCost;
    actor.cooldowns[skill.id] = skill.cooldown;
  }

  if (!skill) {
    const dmg = calcPhysicalDamage(effectiveAtk(actor), 30, effectiveDef(target), rand);
    applyDamage(target, dmg, actor);
    logs.push(makeLog(turn, 'attack', actor, target, '普通攻击', dmg));
    return;
  }

  switch (skill.type) {
    case 'physical': {
      const dmg = calcPhysicalDamage(effectiveAtk(actor), skill.value, effectiveDef(target), rand);
      applyDamage(target, dmg, actor);
      logs.push(makeLog(turn, 'attack', actor, target, skill.name, dmg));
      break;
    }
    case 'magic': {
      const dmg = calcMagicDamage(effectiveAtk(actor), skill.value, effectiveDef(target), rand);
      applyDamage(target, dmg, actor);
      logs.push(makeLog(turn, 'attack', actor, target, skill.name, dmg));
      break;
    }
    case 'heal': {
      const heal = calcHeal(skill.value, rand);
      applyHeal(target, heal, actor);
      logs.push(makeLog(turn, 'heal', actor, target, skill.name, heal));
      break;
    }
    case 'buff': {
      applyBuff(target, skill.value >= 35 ? 'def' : 'atk', skill.value, actor);
      logs.push(makeLog(turn, 'buff', actor, target, skill.name, skill.value));
      break;
    }
    case 'debuff': {
      applyDebuff(target, 'def', skill.value, actor);
      logs.push(makeLog(turn, 'debuff', actor, target, skill.name, skill.value));
      break;
    }
  }
}

export function simulateBattle(
  inputHeroes: Unit[],
  inputEnemies: Unit[],
  options: { maxTurns?: number; seed?: number } = {}
): BattleResult {
  const maxTurns = options.maxTurns ?? 50;
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);
  const rand = mulberry32(seed);

  const heroes = cloneUnits(inputHeroes).map((h) => ({
    ...h,
    hp: h.maxHp,
    mp: h.maxMp,
    alive: true,
    buffs: [],
    debuffs: [],
    cooldowns: {},
    stats: { damageDealt: 0, damageTaken: 0, healingDone: 0, kills: 0, survivedTurns: 0 }
  }));
  const enemies = cloneUnits(inputEnemies).map((e) => ({
    ...e,
    hp: e.maxHp,
    mp: e.maxMp,
    alive: true,
    buffs: [],
    debuffs: [],
    cooldowns: {},
    stats: { damageDealt: 0, damageTaken: 0, healingDone: 0, kills: 0, survivedTurns: 0 }
  }));

  const logs: BattleLog[] = [];
  logs.push({
    id: uuidv4(),
    turn: 0,
    timestamp: Date.now(),
    type: 'system',
    actorId: 'system',
    actorName: '系统',
    message: `战斗开始！英雄${heroes.length}名 VS 敌人${enemies.length}名`
  });

  let winner: Side | 'draw' | null = null;
  let finalTurn = 0;

  for (let turn = 1; turn <= maxTurns; turn++) {
    finalTurn = turn;
    for (const h of heroes) if (h.alive) h.stats.survivedTurns += 1;
    for (const e of enemies) if (e.alive) e.stats.survivedTurns += 1;

    const end = checkBattleEnd(heroes, enemies);
    if (end) {
      winner = end;
      break;
    }

    const allUnits = [...heroes, ...enemies].filter((u) => u.alive);
    allUnits.sort((a, b) => effectiveSpd(b) - effectiveSpd(a));

    for (const unit of allUnits) {
      if (!unit.alive) continue;
      tickBuffsAndDebuffs(unit);
      tickCooldowns(unit);

      const allies = unit.side === 'hero' ? heroes : enemies;
      const foes = unit.side === 'hero' ? enemies : heroes;

      if (!foes.some((f) => f.alive)) break;

      let action;
      if (unit.side === 'enemy') {
        action = decideEnemyAction(unit, allies, foes, rand);
      } else {
        action = decideHeroAction(unit, allies, foes, rand);
      }

      if (action.target) {
        executeAction(unit, action.skill, action.target, turn, logs, rand);
      }
    }
  }

  if (!winner) {
    winner = checkBattleEnd(heroes, enemies) ?? 'draw';
  }

  const endMsg =
    winner === 'hero' ? '英雄方获胜！' : winner === 'enemy' ? '敌方获胜！' : '战斗平局！';
  logs.push({
    id: uuidv4(),
    turn: finalTurn,
    timestamp: Date.now(),
    type: 'system',
    actorId: 'system',
    actorName: '系统',
    message: `${endMsg} 总回合数：${finalTurn}`
  });

  return {
    winner,
    totalTurns: finalTurn,
    heroes,
    enemies,
    logs
  };
}
