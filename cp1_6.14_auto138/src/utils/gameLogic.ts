export type Difficulty = 'easy' | 'normal' | 'hard'

export interface WordItem {
  id: string
  word: string
  x: number
  y: number
  speed: number
  createdAt: number
  status: 'active' | 'exploding' | 'shaking'
}

export interface GameStats {
  totalDestroyed: number
  totalMissed: number
  correctInputs: number
  totalInputs: number
  reactionTimes: number[]
  maxCombo: number
  score: number
}

export interface GameResult {
  totalDestroyed: number
  accuracy: number
  avgReactionTime: number
  maxCombo: number
  score: number
  grade: 'S' | 'A' | 'B' | 'C'
}

const EASY_WORDS = [
  'cat', 'dog', 'sun', 'run', 'jump', 'red', 'blue', 'fast', 'slow', 'big',
  'small', 'hot', 'cold', 'up', 'down', 'left', 'right', 'go', 'stop', 'play',
  'game', 'type', 'word', 'hit', 'miss', 'win', 'lose', 'fire', 'star', 'moon'
]

const NORMAL_WORDS = [
  'pixel', 'battle', 'typing', 'speed', 'combo', 'score', 'level', 'power',
  'attack', 'defend', 'shield', 'energy', 'player', 'enemy', 'target',
  'destroy', 'explode', 'rocket', 'laser', 'plasma', 'galaxy', 'nebula',
  'asteroid', 'spaceship', 'mission', 'arcade', 'retro', 'classic', 'master', 'ninja'
]

const HARD_WORDS = [
  'apocalypse', 'catastrophe', 'destruction', 'armageddon', 'terminator',
  'exterminate', 'obliterate', 'annihilate', 'devastation', 'infiltrate',
  'reconnaissance', 'counterattack', 'reinforcement', 'sabotage', 'stealth',
  'warfare', 'battleground', 'stronghold', 'fortress', 'commander',
  'lieutenant', 'sergeant', 'captain', 'admiral', 'general',
  'magnificent', 'spectacular', 'extraordinary', 'phenomenal', 'legendary'
]

export function getWordPool(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case 'easy':
      return EASY_WORDS
    case 'normal':
      return NORMAL_WORDS
    case 'hard':
      return HARD_WORDS
  }
}

export function getRandomWord(difficulty: Difficulty): string {
  const pool = getWordPool(difficulty)
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getSpeed(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 0.3
    case 'normal':
      return 0.6
    case 'hard':
      return 1.0
  }
}

export function getSpawnInterval(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 2500
    case 'normal':
      return 1800
    case 'hard':
      return 1200
  }
}

export function validateInput(input: string, word: string): boolean {
  return input.toLowerCase() === word.toLowerCase()
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100
  return Math.round((correct / total) * 1000) / 10
}

export function calculateAvgReactionTime(times: number[]): number {
  if (times.length === 0) return 0
  const sum = times.reduce((a, b) => a + b, 0)
  return Math.round(sum / times.length)
}

export function calculateGrade(score: number, accuracy: number, destroyed: number): 'S' | 'A' | 'B' | 'C' {
  if (destroyed === 0) return 'C'
  if (accuracy >= 95 && score >= 500) return 'S'
  if (accuracy >= 85 && score >= 300) return 'A'
  if (accuracy >= 70 && score >= 150) return 'B'
  return 'C'
}

export function getStarsForGrade(grade: 'S' | 'A' | 'B' | 'C'): number {
  switch (grade) {
    case 'S': return 5
    case 'A': return 4
    case 'B': return 3
    case 'C': return 1
  }
}

export function computeGameResult(stats: GameStats): GameResult {
  const accuracy = calculateAccuracy(stats.correctInputs, stats.totalInputs)
  const avgReactionTime = calculateAvgReactionTime(stats.reactionTimes)
  const grade = calculateGrade(stats.score, accuracy, stats.totalDestroyed)

  return {
    totalDestroyed: stats.totalDestroyed,
    accuracy,
    avgReactionTime,
    maxCombo: stats.maxCombo,
    score: stats.score,
    grade
  }
}
