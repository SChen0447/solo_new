import type { Mood, MaterialType } from '@/types'

export function expForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.2, level - 1))
}

export function canLevelUp(level: number, exp: number): boolean {
  if (level >= 30) return false
  return exp >= expForLevel(level)
}

export function addExp(currentLevel: number, currentExp: number, gain: number): { level: number; exp: number } {
  let level = currentLevel
  let exp = currentExp + gain
  while (level < 30 && exp >= expForLevel(level)) {
    exp -= expForLevel(level)
    level += 1
  }
  if (level >= 30) {
    level = 30
    exp = 0
  }
  return { level, exp }
}

export function clampAffinity(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function calculateMoodDecay(lastInteractionAt: number, currentMood: Mood): Mood {
  const elapsed = Date.now() - lastInteractionAt
  const minutes = elapsed / 60000
  if (minutes < 2) return currentMood
  if (minutes < 5) {
    if (currentMood === 'happy') return 'calm'
    if (currentMood === 'calm') return 'calm'
    return currentMood
  }
  if (minutes < 10) {
    if (currentMood === 'happy' || currentMood === 'calm') return 'irritated'
    return 'irritated'
  }
  return 'tired'
}

export function getCheckinReward(streakDays: number): { materials: Partial<Record<MaterialType, number>>; bonus: string | null } {
  const dayInCycle = ((streakDays - 1) % 7) + 1
  const materials: Partial<Record<MaterialType, number>> = {
    stardust: 3 + dayInCycle,
    crystalShard: 2 + Math.floor(dayInCycle / 2),
    mossSpore: 2,
    shellFragment: 2,
  }
  let bonus: string | null = null
  if (dayInCycle === 3) {
    bonus = '水晶塞装饰'
  } else if (dayInCycle === 5) {
    bonus = '星光露×2'
    materials.stardust = (materials.stardust || 0) + 20
  } else if (dayInCycle === 7) {
    bonus = '新瓶子背景物'
    materials.stardust = (materials.stardust || 0) + 30
    materials.crystalShard = (materials.crystalShard || 0) + 10
  }
  return { materials, bonus }
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getToday(): string {
  return formatDate(new Date())
}

export function getStreakDays(records: { date: string }[]): number {
  if (records.length === 0) return 0
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const today = getToday()
  const yesterday = formatDate(new Date(Date.now() - 86400000))
  if (sorted[0].date !== today && sorted[0].date !== yesterday) return 0
  let streak = 1
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i].date)
    const prev = new Date(sorted[i + 1].date)
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (Math.abs(diff - 1) < 0.01) {
      streak++
    } else {
      break
    }
  }
  return streak
}
