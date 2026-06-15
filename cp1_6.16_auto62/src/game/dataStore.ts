import { create } from 'zustand';
import type {
  CharacterTemplate,
  Character,
  EnemyGroup,
  BattleStatistics,
  DataStoreState,
  CharacterClass,
  SkillAllocation,
} from './types';

const CLASS_COLORS: Record<CharacterClass, string> = {
  warrior: '#FF4500',
  mage: '#1E90FF',
  assassin: '#32CD32',
  priest: '#FFD700',
  ranger: '#FF69B4',
  warlock: '#9400D3',
};

const AVAILABLE_CLASSES: CharacterTemplate[] = [
  {
    class: 'warrior',
    name: '战士',
    emoji: '⚔️',
    color: CLASS_COLORS.warrior,
    baseHp: 150,
    baseAttack: 35,
    baseDefense: 25,
    baseSpeed: 8,
    skills: [
      { id: 'warrior_slash', name: '猛击', type: 'active', effectType: 'single', cost: 10, cooldown: 0, baseValue: 50, description: '对单个敌人造成强力物理伤害' },
      { id: 'warrior_whirlwind', name: '旋风斩', type: 'active', effectType: 'aoe', cost: 25, cooldown: 2, baseValue: 35, description: '对所有敌人造成范围伤害' },
      { id: 'warrior_shield_bash', name: '盾击', type: 'active', effectType: 'control', cost: 15, cooldown: 3, baseValue: 30, description: '眩晕敌人1回合并造成伤害' },
      { id: 'warrior_toughness', name: '坚韧', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '永久提升生命值上限' },
      { id: 'warrior_armor_mastery', name: '护甲精通', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 15, description: '永久提升防御力' },
      { id: 'warrior_battle_cry', name: '战吼', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 10, description: '战斗开始时提升全队攻击力' },
    ],
  },
  {
    class: 'mage',
    name: '法师',
    emoji: '🔮',
    color: CLASS_COLORS.mage,
    baseHp: 80,
    baseAttack: 55,
    baseDefense: 10,
    baseSpeed: 12,
    skills: [
      { id: 'mage_fireball', name: '火球术', type: 'active', effectType: 'single', cost: 15, cooldown: 0, baseValue: 65, description: '发射火球造成高额魔法伤害' },
      { id: 'mage_blizzard', name: '暴风雪', type: 'active', effectType: 'aoe', cost: 35, cooldown: 3, baseValue: 45, description: '召唤暴风雪对所有敌人造成伤害' },
      { id: 'mage_arcane_intellect', name: '奥术智慧', type: 'active', effectType: 'buff', cost: 20, cooldown: 4, baseValue: 25, description: '提升全队攻击力3回合' },
      { id: 'mage_mana_affinity', name: '法力亲和', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 15, description: '永久提升法术伤害' },
      { id: 'mage_ice_armor', name: '冰甲', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 10, description: '受到攻击时有几率冻结敌人' },
      { id: 'mage_spell_crit', name: '法术暴击', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '提升法术暴击几率' },
    ],
  },
  {
    class: 'assassin',
    name: '刺客',
    emoji: '🗡️',
    color: CLASS_COLORS.assassin,
    baseHp: 90,
    baseAttack: 50,
    baseDefense: 12,
    baseSpeed: 18,
    skills: [
      { id: 'assassin_backstab', name: '背刺', type: 'active', effectType: 'single', cost: 12, cooldown: 0, baseValue: 70, description: '从背后攻击造成高额暴击伤害' },
      { id: 'assassin_poison_blade', name: '淬毒', type: 'active', effectType: 'debuff', cost: 18, cooldown: 2, baseValue: 25, description: '使敌人中毒，每回合持续掉血' },
      { id: 'assassin_shadow_step', name: '暗影步', type: 'active', effectType: 'single', cost: 20, cooldown: 3, baseValue: 55, description: '瞬移到敌人身边并造成伤害' },
      { id: 'assassin_critical_mastery', name: '暴击精通', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 25, description: '永久提升暴击率' },
      { id: 'assassin_evasion', name: '闪避', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '提升闪避几率' },
      { id: 'assassin_lethality', name: '致命', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 15, description: '对低血量敌人造成额外伤害' },
    ],
  },
  {
    class: 'priest',
    name: '牧师',
    emoji: '✨',
    color: CLASS_COLORS.priest,
    baseHp: 100,
    baseAttack: 25,
    baseDefense: 18,
    baseSpeed: 10,
    skills: [
      { id: 'priest_heal', name: '治疗术', type: 'active', effectType: 'heal', cost: 15, cooldown: 0, baseValue: 60, description: '恢复单个队友大量生命值' },
      { id: 'priest_group_heal', name: '群体治愈', type: 'active', effectType: 'heal', cost: 30, cooldown: 3, baseValue: 35, description: '恢复全队生命值' },
      { id: 'priest_divine_shield', name: '神圣护盾', type: 'active', effectType: 'buff', cost: 25, cooldown: 4, baseValue: 40, description: '为队友施加护盾，吸收伤害' },
      { id: 'priest_divine_grace', name: '神恩', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '提升治疗效果' },
      { id: 'priest_spirit_resonance', name: '精神共鸣', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 15, description: '每次治疗提升队友攻击力' },
      { id: 'priest_holy_aura', name: '圣洁光环', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 10, description: '全队受到的伤害降低' },
    ],
  },
  {
    class: 'ranger',
    name: '游侠',
    emoji: '🏹',
    color: CLASS_COLORS.ranger,
    baseHp: 110,
    baseAttack: 45,
    baseDefense: 15,
    baseSpeed: 15,
    skills: [
      { id: 'ranger_precise_shot', name: '精准射击', type: 'active', effectType: 'single', cost: 12, cooldown: 0, baseValue: 55, description: '精准瞄准敌人要害造成伤害' },
      { id: 'ranger_multi_shot', name: '多重射击', type: 'active', effectType: 'aoe', cost: 28, cooldown: 2, baseValue: 30, description: '同时射击多个敌人' },
      { id: 'ranger_trap', name: '陷阱', type: 'active', effectType: 'control', cost: 20, cooldown: 3, baseValue: 20, description: '放置陷阱眩晕敌人2回合' },
      { id: 'ranger_marksmanship', name: '箭术', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '永久提升远程伤害' },
      { id: 'ranger_beast_taming', name: '驯兽', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 15, description: '召唤野兽协助战斗' },
      { id: 'ranger_swift_movement', name: '迅捷', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 18, description: '永久提升速度' },
    ],
  },
  {
    class: 'warlock',
    name: '术士',
    emoji: '💀',
    color: CLASS_COLORS.warlock,
    baseHp: 85,
    baseAttack: 50,
    baseDefense: 10,
    baseSpeed: 11,
    skills: [
      { id: 'warlock_curse', name: '痛苦诅咒', type: 'active', effectType: 'debuff', cost: 15, cooldown: 0, baseValue: 40, description: '诅咒敌人，持续造成伤害' },
      { id: 'warlock_shadow_bolt', name: '暗影箭', type: 'active', effectType: 'aoe', cost: 32, cooldown: 2, baseValue: 40, description: '发射暗影箭对所有敌人造成伤害' },
      { id: 'warlock_soul_drain', name: '灵魂吸取', type: 'active', effectType: 'single', cost: 25, cooldown: 3, baseValue: 60, description: '吸取敌人灵魂，造成伤害并恢复自身生命' },
      { id: 'warlock_dark_pact', name: '黑暗契约', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 25, description: '牺牲部分生命提升法术伤害' },
      { id: 'warlock_fear_aura', name: '恐惧光环', type: 'passive', effectType: 'debuff', cost: 0, cooldown: 0, baseValue: 12, description: '降低周围敌人的攻击力' },
      { id: 'warlock_soulstone', name: '灵魂石', type: 'passive', effectType: 'buff', cost: 0, cooldown: 0, baseValue: 20, description: '死亡时有几率复活一次' },
    ],
  },
];

const ENEMY_GROUPS: EnemyGroup[] = [
  {
    id: 'beast_horde',
    name: '野兽军团',
    enemies: [
      { id: 'wolf_1', name: '狂狼', emoji: '🐺', hp: 80, attack: 25, defense: 8, speed: 14 },
      { id: 'wolf_2', name: '狂狼', emoji: '🐺', hp: 80, attack: 25, defense: 8, speed: 14 },
      { id: 'bear', name: '巨熊', emoji: '🐻', hp: 150, attack: 35, defense: 15, speed: 6 },
      { id: 'boar', name: '野猪', emoji: '🐗', hp: 100, attack: 30, defense: 12, speed: 10 },
    ],
  },
  {
    id: 'elemental_golems',
    name: '元素傀儡',
    enemies: [
      { id: 'fire_golem', name: '火元素', emoji: '🔥', hp: 120, attack: 45, defense: 10, speed: 8 },
      { id: 'ice_golem', name: '冰元素', emoji: '❄️', hp: 120, attack: 40, defense: 15, speed: 7 },
      { id: 'earth_golem', name: '土元素', emoji: '🪨', hp: 180, attack: 30, defense: 25, speed: 5 },
      { id: 'lightning_golem', name: '雷元素', emoji: '⚡', hp: 90, attack: 50, defense: 8, speed: 16 },
    ],
  },
  {
    id: 'shadow_assassins',
    name: '暗影刺客团',
    enemies: [
      { id: 'assassin_1', name: '暗影刺客', emoji: '🥷', hp: 70, attack: 50, defense: 5, speed: 20 },
      { id: 'assassin_2', name: '暗影刺客', emoji: '🥷', hp: 70, attack: 50, defense: 5, speed: 20 },
      { id: 'assassin_3', name: '暗影刺客', emoji: '🥷', hp: 70, attack: 50, defense: 5, speed: 20 },
      { id: 'shadow_master', name: '暗影宗师', emoji: '👤', hp: 100, attack: 60, defense: 10, speed: 18 },
    ],
  },
];

const createDefaultSkillAllocations = (template: CharacterTemplate): SkillAllocation[] => {
  return template.skills.map((skill) => ({
    skillId: skill.id,
    level: 0,
  }));
};

const generateCharacterId = (): string => {
  return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useDataStore = create<DataStoreState>((set, get) => ({
  selectedCharacters: [],
  availableClasses: AVAILABLE_CLASSES,
  enemyGroups: ENEMY_GROUPS,
  battleStatistics: null,
  isSimulating: false,
  simulationProgress: 0,

  selectCharacter: (template: CharacterTemplate, slotIndex: number) => {
    set((state) => {
      const newCharacters = [...state.selectedCharacters];
      const newChar: Character = {
        id: generateCharacterId(),
        template,
        skillAllocations: createDefaultSkillAllocations(template),
      };
      newCharacters[slotIndex] = newChar;
      return { selectedCharacters: newCharacters };
    });
  },

  removeCharacter: (slotIndex: number) => {
    set((state) => {
      const newCharacters = [...state.selectedCharacters];
      newCharacters.splice(slotIndex, 1);
      return { selectedCharacters: newCharacters };
    });
  },

  allocateSkillPoint: (characterId: string, skillId: string, points: number) => {
    const state = get();
    const charIndex = state.selectedCharacters.findIndex((c) => c.id === characterId);
    if (charIndex === -1) return;

    const remainingPoints = state.getRemainingPoints(characterId);
    const actualPoints = Math.min(points, remainingPoints);
    if (actualPoints <= 0) return;

    set((state) => {
      const newCharacters = [...state.selectedCharacters];
      const char = { ...newCharacters[charIndex] };
      const allocations = [...char.skillAllocations];
      const skillIndex = allocations.findIndex((a) => a.skillId === skillId);
      
      if (skillIndex !== -1) {
        const allocation = { ...allocations[skillIndex] };
        const newLevel = Math.min(5, allocation.level + actualPoints);
        allocation.level = newLevel;
        allocations[skillIndex] = allocation;
      }
      
      char.skillAllocations = allocations;
      newCharacters[charIndex] = char;
      return { selectedCharacters: newCharacters };
    });
  },

  resetSkillPoints: (characterId: string) => {
    set((state) => {
      const newCharacters = state.selectedCharacters.map((c) => {
        if (c.id === characterId) {
          return {
            ...c,
            skillAllocations: createDefaultSkillAllocations(c.template),
          };
        }
        return c;
      });
      return { selectedCharacters: newCharacters };
    });
  },

  getRemainingPoints: (characterId: string): number => {
    const state = get();
    const char = state.selectedCharacters.find((c) => c.id === characterId);
    if (!char) return 0;
    
    const usedPoints = char.skillAllocations.reduce((sum, alloc) => sum + alloc.level, 0);
    return Math.max(0, 20 - usedPoints);
  },

  setBattleStatistics: (stats: BattleStatistics | null) => {
    set({ battleStatistics: stats });
  },

  setIsSimulating: (simulating: boolean) => {
    set({ isSimulating: simulating });
  },

  setSimulationProgress: (progress: number) => {
    set({ simulationProgress: progress });
  },
}));

export { CLASS_COLORS, AVAILABLE_CLASSES, ENEMY_GROUPS };
