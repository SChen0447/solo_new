export type CreatureType = 'fire' | 'water' | 'wind' | 'rock' | 'shadow'
export type Mood = 'happy' | 'calm' | 'irritated' | 'tired'
export type FoodType = 'sweetBerry' | 'magicMushroom' | 'starlightDew'
export type MusicType = 'gentle' | 'lively' | 'mysterious'
export type DecorationSlot = 'stopper' | 'background' | 'glow'
export type MaterialType = 'stardust' | 'crystalShard' | 'mossSpore' | 'shellFragment'
export type AnimationState = 'idle' | 'feeding' | 'mushroom' | 'music' | 'cleaning' | 'sleeping'

export interface Creature {
  id: string
  name: string
  type: CreatureType
  level: number
  exp: number
  affinity: number
  mood: Mood
  lastInteractionAt: number
  decorations: {
    stopper: string | null
    background: string | null
    glow: string | null
  }
  unlocked: boolean
}

export interface Decoration {
  id: string
  slot: DecorationSlot
  name: string
  materialCost: Record<MaterialType, number>
  description: string
}

export interface CheckinRecord {
  date: string
  streakDays: number
}

export interface FoodInfo {
  type: FoodType
  name: string
  affinityGain: number
  moodEffect: Mood | null
  emoji: string
}

export interface MusicInfo {
  type: MusicType
  name: string
  moodBoost: Mood
  emoji: string
}

export interface BottleStyle {
  gradient: string
  borderColor: string
  glowColor: string
  innerPattern: string
}

export const CREATURE_TYPE_NAMES: Record<CreatureType, string> = {
  fire: '火焰',
  water: '流水',
  wind: '微风',
  rock: '岩石',
  shadow: '暗影',
}

export const MOOD_NAMES: Record<Mood, string> = {
  happy: '快乐',
  calm: '平静',
  irritated: '烦躁',
  tired: '疲惫',
}

export const MATERIAL_NAMES: Record<MaterialType, string> = {
  stardust: '星辰沙',
  crystalShard: '水晶石',
  mossSpore: '苔藓',
  shellFragment: '小贝壳',
}

export const FOOD_INFO: Record<FoodType, FoodInfo> = {
  sweetBerry: {
    type: 'sweetBerry',
    name: '甜浆果',
    affinityGain: 5,
    moodEffect: 'happy',
    emoji: '🫐',
  },
  magicMushroom: {
    type: 'magicMushroom',
    name: '魔法蘑菇',
    affinityGain: 10,
    moodEffect: 'irritated',
    emoji: '🍄',
  },
  starlightDew: {
    type: 'starlightDew',
    name: '星光露',
    affinityGain: 15,
    moodEffect: 'happy',
    emoji: '✨',
  },
}

export const MUSIC_INFO: Record<MusicType, MusicInfo> = {
  gentle: { type: 'gentle', name: '轻柔曲', moodBoost: 'calm', emoji: '🎵' },
  lively: { type: 'lively', name: '欢快曲', moodBoost: 'happy', emoji: '🎶' },
  mysterious: { type: 'mysterious', name: '神秘曲', moodBoost: 'calm', emoji: '🎼' },
}
