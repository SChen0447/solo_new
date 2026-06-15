export type CharacterClass = 'warrior' | 'mage' | 'assassin' | 'priest' | 'ranger' | 'warlock';

export type SkillEffectType = 'single' | 'aoe' | 'heal' | 'buff' | 'debuff' | 'control';

export type SkillType = 'active' | 'passive';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  effectType: SkillEffectType;
  cost: number;
  cooldown: number;
  baseValue: number;
  description: string;
}

export interface SkillAllocation {
  skillId: string;
  level: number;
}

export interface CharacterTemplate {
  class: CharacterClass;
  name: string;
  emoji: string;
  color: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  skills: Skill[];
}

export interface Character {
  id: string;
  template: CharacterTemplate;
  skillAllocations: SkillAllocation[];
}

export interface EnemyUnit {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface EnemyGroup {
  id: string;
  name: string;
  enemies: EnemyUnit[];
}

export interface BattleCharacter {
  id: string;
  template: CharacterTemplate;
  skillAllocations: SkillAllocation[];
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  cooldowns: Record<string, number>;
  buffs: Buff[];
  debuffs: Debuff[];
  isAlive: boolean;
  totalDamageDealt: number;
  totalHealingDone: number;
  skillsUsed: Record<string, number>;
}

export interface BattleEnemy {
  id: string;
  unit: EnemyUnit;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  debuffs: Debuff[];
  isAlive: boolean;
  isControlled: boolean;
}

export interface Buff {
  type: 'attack' | 'defense' | 'speed';
  value: number;
  duration: number;
}

export interface Debuff {
  type: 'attack' | 'defense' | 'speed' | 'stun' | 'poison';
  value: number;
  duration: number;
}

export interface BattleLogEntry {
  turn: number;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  healing?: number;
}

export interface SingleBattleResult {
  victory: boolean;
  survivingCharacters: number;
  enemiesKilled: number;
  rounds: number;
  characterDamage: Record<string, number>;
  characterHealing: Record<string, number>;
  skillUsage: Record<string, number>;
  log: BattleLogEntry[];
}

export interface BattleStatistics {
  totalBattles: number;
  wins: number;
  winRate: number;
  avgSurvivalRounds: number;
  maxSingleDamage: number;
  totalDamageByClass: Record<CharacterClass, number>;
  skillUsageFrequency: Record<string, number>;
  survivalRounds: number[];
  battleResults: SingleBattleResult[];
  classDamagePercentage: { class: CharacterClass; name: string; value: number; color: string }[];
  topSkills: { name: string; count: number; class: CharacterClass }[];
}

export interface DataStoreState {
  selectedCharacters: Character[];
  availableClasses: CharacterTemplate[];
  enemyGroups: EnemyGroup[];
  battleStatistics: BattleStatistics | null;
  isSimulating: boolean;
  simulationProgress: number;
  selectCharacter: (template: CharacterTemplate, slotIndex: number) => void;
  removeCharacter: (slotIndex: number) => void;
  allocateSkillPoint: (characterId: string, skillId: string, points: number) => void;
  resetSkillPoints: (characterId: string) => void;
  setBattleStatistics: (stats: BattleStatistics | null) => void;
  setIsSimulating: (simulating: boolean) => void;
  setSimulationProgress: (progress: number) => void;
  getRemainingPoints: (characterId: string) => number;
}
