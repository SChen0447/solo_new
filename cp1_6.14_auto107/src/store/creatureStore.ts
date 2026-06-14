import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import type { Creature, FoodType, MusicType, DecorationSlot, MaterialType, CheckinRecord, AnimationState } from '@/types'
import { FOOD_INFO, MUSIC_INFO } from '@/types'
import { INITIAL_CREATURES, DECORATIONS } from '@/data/creatures'
import { addExp, clampAffinity, calculateMoodDecay, getCheckinReward, getToday, getStreakDays } from '@/utils/helpers'

interface CreatureStore {
  creatures: Creature[]
  currentCreatureId: string | null
  materials: Record<MaterialType, number>
  checkinRecords: CheckinRecord[]
  animationState: AnimationState
  animationTimestamp: number
  lastActionAt: number

  selectCreature: (id: string) => void
  feedCreature: (foodType: FoodType) => void
  playMusic: (musicType: MusicType) => void
  cleanBottle: () => void
  tickMoodDecay: () => void
  applyDecoration: (creatureId: string, slot: DecorationSlot, decorationId: string) => boolean
  checkin: () => { materials: Partial<Record<MaterialType, number>>; bonus: string | null } | null
  setAnimationState: (state: AnimationState) => void
  addCreature: (type: Creature['type']) => void
  getCurrentCreature: () => Creature | undefined
  canAffordDecoration: (decorationId: string) => boolean
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

const COOLDOWN_MS = 1500

export const useCreatureStore = create<CreatureStore>((set, get) => ({
  creatures: loadFromStorage('bottle-spirits-creatures', INITIAL_CREATURES),
  currentCreatureId: loadFromStorage<string | null>('bottle-spirits-current', null),
  materials: loadFromStorage<Record<MaterialType, number>>('bottle-spirits-materials', {
    stardust: 20,
    crystalShard: 10,
    mossSpore: 5,
    shellFragment: 5,
  }),
  checkinRecords: loadFromStorage<CheckinRecord[]>('bottle-spirits-checkins', []),
  animationState: 'idle',
  animationTimestamp: 0,
  lastActionAt: 0,

  selectCreature: (id) => {
    set({ currentCreatureId: id })
    saveToStorage('bottle-spirits-current', id)
  },

  feedCreature: (foodType) => {
    const state = get()
    if (Date.now() - state.lastActionAt < COOLDOWN_MS) return
    const creature = state.creatures.find(c => c.id === state.currentCreatureId)
    if (!creature || !creature.unlocked) return

    const food = FOOD_INFO[foodType]
    const { level, exp } = addExp(creature.level, creature.exp, food.affinityGain * 2)
    const newAffinity = clampAffinity(creature.affinity + food.affinityGain)
    const newMood: AnimationState = foodType === 'magicMushroom' ? 'mushroom' : 'feeding'

    const updated = state.creatures.map(c =>
      c.id === creature.id
        ? { ...c, affinity: newAffinity, mood: food.moodEffect || c.mood, level, exp, lastInteractionAt: Date.now() }
        : c
    )
    set({ creatures: updated, animationState: newMood, animationTimestamp: Date.now(), lastActionAt: Date.now() })
    saveToStorage('bottle-spirits-creatures', updated)
  },

  playMusic: (musicType) => {
    const state = get()
    if (Date.now() - state.lastActionAt < COOLDOWN_MS) return
    const creature = state.creatures.find(c => c.id === state.currentCreatureId)
    if (!creature || !creature.unlocked) return

    const music = MUSIC_INFO[musicType]
    const { level, exp } = addExp(creature.level, creature.exp, 3)
    const newAffinity = clampAffinity(creature.affinity + 3)

    const updated = state.creatures.map(c =>
      c.id === creature.id
        ? { ...c, affinity: newAffinity, mood: music.moodBoost, level, exp, lastInteractionAt: Date.now() }
        : c
    )
    set({ creatures: updated, animationState: 'music', animationTimestamp: Date.now(), lastActionAt: Date.now() })
    saveToStorage('bottle-spirits-creatures', updated)
  },

  cleanBottle: () => {
    const state = get()
    if (Date.now() - state.lastActionAt < COOLDOWN_MS) return
    const creature = state.creatures.find(c => c.id === state.currentCreatureId)
    if (!creature || !creature.unlocked) return

    const { level, exp } = addExp(creature.level, creature.exp, 2)
    const newAffinity = clampAffinity(creature.affinity + 2)

    const updated = state.creatures.map(c =>
      c.id === creature.id
        ? { ...c, affinity: newAffinity, level, exp, lastInteractionAt: Date.now() }
        : c
    )
    set({ creatures: updated, animationState: 'cleaning', animationTimestamp: Date.now(), lastActionAt: Date.now() })
    saveToStorage('bottle-spirits-creatures', updated)
  },

  tickMoodDecay: () => {
    const state = get()
    const updated = state.creatures.map(c => {
      if (!c.unlocked) return c
      const newMood = calculateMoodDecay(c.lastInteractionAt, c.mood)
      return newMood !== c.mood ? { ...c, mood: newMood } : c
    })
    set({ creatures: updated })
    saveToStorage('bottle-spirits-creatures', updated)
  },

  applyDecoration: (creatureId, slot, decorationId) => {
    const state = get()
    const deco = DECORATIONS.find(d => d.id === decorationId)
    if (!deco) return false

    const canAfford = (Object.entries(deco.materialCost) as [MaterialType, number][]).every(
      ([mat, cost]) => state.materials[mat] >= cost
    )
    if (!canAfford) return false

    const newMaterials = { ...state.materials }
    ;(Object.entries(deco.materialCost) as [MaterialType, number][]).forEach(([mat, cost]) => {
      newMaterials[mat] -= cost
    })

    const updated = state.creatures.map(c =>
      c.id === creatureId
        ? { ...c, decorations: { ...c.decorations, [slot]: decorationId } }
        : c
    )
    set({ creatures: updated, materials: newMaterials })
    saveToStorage('bottle-spirits-creatures', updated)
    saveToStorage('bottle-spirits-materials', newMaterials)
    return true
  },

  checkin: () => {
    const state = get()
    const today = getToday()
    if (state.checkinRecords.some(r => r.date === today)) return null

    const streak = getStreakDays(state.checkinRecords) + 1
    const reward = getCheckinReward(streak)

    const newMaterials = { ...state.materials }
    ;(Object.entries(reward.materials) as [MaterialType, number][]).forEach(([mat, amount]) => {
      newMaterials[mat] = (newMaterials[mat] || 0) + amount
    })

    const newRecords = [...state.checkinRecords, { date: today, streakDays: streak }]
    set({ checkinRecords: newRecords, materials: newMaterials })
    saveToStorage('bottle-spirits-checkins', newRecords)
    saveToStorage('bottle-spirits-materials', newMaterials)
    return reward
  },

  setAnimationState: (animState) => {
    set({ animationState: animState, animationTimestamp: Date.now() })
  },

  addCreature: (type) => {
    const nameMap: Record<string, string> = { fire: '焰灵', water: '澜灵', wind: '风灵', rock: '岩灵', shadow: '影灵' }
    const newCreature: Creature = {
      id: uuidv4(),
      name: nameMap[type] || '精灵',
      type,
      level: 1,
      exp: 0,
      affinity: 50,
      mood: 'calm',
      lastInteractionAt: Date.now(),
      decorations: { stopper: null, background: null, glow: null },
      unlocked: true,
    }
    const updated = [...get().creatures.map(c => c.type === type ? { ...c, unlocked: true } : c), newCreature]
    set({ creatures: updated })
    saveToStorage('bottle-spirits-creatures', updated)
  },

  getCurrentCreature: () => {
    const state = get()
    return state.creatures.find(c => c.id === state.currentCreatureId)
  },

  canAffordDecoration: (decorationId) => {
    const state = get()
    const deco = DECORATIONS.find(d => d.id === decorationId)
    if (!deco) return false
    return (Object.entries(deco.materialCost) as [MaterialType, number][]).every(
      ([mat, cost]) => state.materials[mat] >= cost
    )
  },
}))
