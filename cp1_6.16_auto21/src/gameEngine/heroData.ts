import { v4 as uuidv4 } from 'uuid'

export type HeroType = 'warrior' | 'archer' | 'mage' | 'healer'
export type AttackType = 'melee' | 'ranged'
export type StatusType = 'burn' | 'shield' | 'heal'
export type Player = 1 | 2

export interface StatusEffect {
  id: string
  type: StatusType
  name: string
  duration: number
  damagePerTurn?: number
  damageReduction?: number
  healPerTurn?: number
}

export interface Skill {
  id: string
  name: string
  description: string
  cooldown: number
  currentCooldown: number
  range: number
  icon: string
  effect: StatusType
  effectValue: number
  effectDuration: number
}

export interface Hero {
  id: string
  name: string
  type: HeroType
  player: Player
  maxHp: number
  currentHp: number
  attack: number
  defense: number
  moveRange: number
  attackRange: number
  attackType: AttackType
  position: { x: number; y: number }
  skills: Skill[]
  statusEffects: StatusEffect[]
  hasMoved: boolean
  hasActed: boolean
  avatar: string
}

export const createSkill = (
  name: string,
  description: string,
  cooldown: number,
  range: number,
  icon: string,
  effect: StatusType,
  effectValue: number,
  effectDuration: number
): Skill => ({
  id: uuidv4(),
  name,
  description,
  cooldown,
  currentCooldown: 0,
  range,
  icon,
  effect,
  effectValue,
  effectDuration
})

export const createStatusEffect = (
  type: StatusType,
  duration: number,
  value: number
): StatusEffect => {
  const base: StatusEffect = {
    id: uuidv4(),
    type,
    name: type === 'burn' ? '燃烧' : type === 'shield' ? '护盾' : '治疗',
    duration
  }

  if (type === 'burn') {
    base.damagePerTurn = value
  } else if (type === 'shield') {
    base.damageReduction = value
  } else if (type === 'heal') {
    base.healPerTurn = value
  }

  return base
}

export const createHero = (
  type: HeroType,
  player: Player,
  position: { x: number; y: number }
): Hero => {
  const heroTemplates: Record<HeroType, Omit<Hero, 'id' | 'player' | 'position' | 'statusEffects' | 'hasMoved' | 'hasActed' | 'skills'>> = {
    warrior: {
      name: '战士',
      type: 'warrior',
      maxHp: 120,
      currentHp: 120,
      attack: 25,
      defense: 15,
      moveRange: 3,
      attackRange: 1,
      attackType: 'melee',
      avatar: '⚔️'
    },
    archer: {
      name: '弓箭手',
      type: 'archer',
      maxHp: 80,
      currentHp: 80,
      attack: 20,
      defense: 8,
      moveRange: 4,
      attackRange: 3,
      attackType: 'ranged',
      avatar: '🏹'
    },
    mage: {
      name: '法师',
      type: 'mage',
      maxHp: 70,
      currentHp: 70,
      attack: 30,
      defense: 5,
      moveRange: 3,
      attackRange: 3,
      attackType: 'ranged',
      avatar: '🔮'
    },
    healer: {
      name: '治疗师',
      type: 'healer',
      maxHp: 90,
      currentHp: 90,
      attack: 15,
      defense: 10,
      moveRange: 4,
      attackRange: 2,
      attackType: 'ranged',
      avatar: '💚'
    }
  }

  const skillSets: Record<HeroType, Skill[]> = {
    warrior: [
      createSkill('战吼', '为自己添加护盾，减伤30%持续2回合', 3, 0, '🛡️', 'shield', 30, 2),
      createSkill('猛击', '对敌人造成伤害并附加燃烧，每回合5血持续3回合', 2, 1, '🔥', 'burn', 5, 3)
    ],
    archer: [
      createSkill('穿透箭', '远程攻击并附加燃烧效果', 2, 3, '🏹', 'burn', 5, 3),
      createSkill('闪避护盾', '为自己添加护盾', 3, 0, '✨', 'shield', 30, 2)
    ],
    mage: [
      createSkill('火焰喷射', '对敌人造成燃烧效果', 2, 3, '🔥', 'burn', 8, 3),
      createSkill('魔法护盾', '为自己添加强力护盾', 3, 0, '🔮', 'shield', 50, 2)
    ],
    healer: [
      createSkill('治愈术', '为友军恢复生命，每回合恢复10血持续2回合', 2, 2, '💚', 'heal', 10, 2),
      createSkill('神圣护盾', '为友军添加护盾', 3, 2, '✨', 'shield', 30, 2)
    ]
  }

  const template = heroTemplates[type]
  const skills = skillSets[type]

  return {
    id: uuidv4(),
    ...template,
    player,
    position,
    skills,
    statusEffects: [],
    hasMoved: false,
    hasActed: false
  }
}

export const getInitialHeroes = (): Hero[] => {
  return [
    createHero('warrior', 1, { x: 1, y: 2 }),
    createHero('archer', 1, { x: 0, y: 3 }),
    createHero('mage', 1, { x: 1, y: 4 }),
    createHero('warrior', 2, { x: 8, y: 2 }),
    createHero('archer', 2, { x: 9, y: 3 }),
    createHero('healer', 2, { x: 8, y: 4 })
  ]
}
