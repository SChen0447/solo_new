import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  Difficulty,
  WordItem,
  GameStats,
  GameResult,
  getRandomWord,
  getSpeed,
  validateInput,
  computeGameResult
} from '../utils/gameLogic'

type GameStatus = 'menu' | 'playing' | 'gameover'

interface GameState {
  status: GameStatus
  difficulty: Difficulty
  words: WordItem[]
  score: number
  lives: number
  combo: number
  maxCombo: number
  stats: GameStats
  input: string
  result: GameResult | null
  battlefieldWidth: number

  setDifficulty: (d: Difficulty) => void
  setBattlefieldWidth: (w: number) => void
  startGame: () => void
  endGame: () => void
  spawnWord: () => void
  updateWords: (delta: number) => void
  setInput: (input: string) => void
  submitInput: () => void
  removeExploded: (id: string) => void
}

const initialStats: GameStats = {
  totalDestroyed: 0,
  totalMissed: 0,
  correctInputs: 0,
  totalInputs: 0,
  reactionTimes: [],
  maxCombo: 0,
  score: 0
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'menu',
  difficulty: 'normal',
  words: [],
  score: 0,
  lives: 3,
  combo: 0,
  maxCombo: 0,
  stats: initialStats,
  input: '',
  result: null,
  battlefieldWidth: 800,

  setDifficulty: (d) => set({ difficulty: d }),

  setBattlefieldWidth: (w) => set({ battlefieldWidth: w }),

  startGame: () => {
    set({
      status: 'playing',
      words: [],
      score: 0,
      lives: 3,
      combo: 0,
      maxCombo: 0,
      stats: initialStats,
      input: '',
      result: null
    })
  },

  endGame: () => {
    const { stats } = get()
    const result = computeGameResult(stats)
    set({ status: 'gameover', result })
  },

  spawnWord: () => {
    const { difficulty, battlefieldWidth } = get()
    const word = getRandomWord(difficulty)
    const speed = getSpeed(difficulty)
    const y = 60 + Math.random() * 180
    const newWord: WordItem = {
      id: uuidv4(),
      word,
      x: battlefieldWidth + 20,
      y,
      speed,
      createdAt: Date.now(),
      status: 'active'
    }
    set((state) => ({ words: [...state.words, newWord] }))
  },

  updateWords: (delta) => {
    const { words, lives } = get()
    let missedCount = 0
    const updated: WordItem[] = []
    const leftBoundary = -150

    for (const w of words) {
      if (w.status === 'exploding') {
        updated.push(w)
        continue
      }
      const newX = w.x - w.speed * delta
      if (newX < leftBoundary) {
        missedCount++
      } else {
        updated.push({ ...w, x: newX })
      }
    }

    if (missedCount > 0) {
      const newLives = lives - missedCount
      const newStats = { ...get().stats, totalMissed: get().stats.totalMissed + missedCount }
      if (newLives <= 0) {
        set({ words: updated, lives: 0, combo: 0, stats: newStats })
        get().endGame()
        return
      }
      set({ words: updated, lives: newLives, combo: 0, stats: newStats })
    } else {
      set({ words: updated })
    }
  },

  setInput: (input) => set({ input }),

  submitInput: () => {
    const { input, words, combo, stats } = get()
    if (!input.trim()) return

    const targetIndex = words.findIndex(
      (w) => w.status === 'active' && validateInput(input, w.word)
    )

    const newTotalInputs = stats.totalInputs + 1

    if (targetIndex !== -1) {
      const target = words[targetIndex]
      const reactionTime = Date.now() - target.createdAt
      const newCombo = combo + 1
      const newMaxCombo = Math.max(newCombo, stats.maxCombo)
      const newScore = stats.score + 10
      const newCorrectInputs = stats.correctInputs + 1
      const newReactionTimes = [...stats.reactionTimes, reactionTime]

      const updatedWords = [...words]
      updatedWords[targetIndex] = { ...target, status: 'exploding' }

      set({
        words: updatedWords,
        input: '',
        combo: newCombo,
        score: newScore,
        maxCombo: newMaxCombo,
        stats: {
          ...stats,
          totalDestroyed: stats.totalDestroyed + 1,
          correctInputs: newCorrectInputs,
          totalInputs: newTotalInputs,
          reactionTimes: newReactionTimes,
          maxCombo: newMaxCombo,
          score: newScore
        }
      })
    } else {
      const updatedWords: WordItem[] = words.map((w) =>
        w.status === 'active' ? { ...w, status: 'shaking' as const } : w
      )

      setTimeout(() => {
        set((state) => ({
          words: state.words.map((w) =>
            w.status === 'shaking' ? { ...w, status: 'active' } : w
          )
        }))
      }, 300)

      set({
        words: updatedWords,
        input: '',
        combo: 0,
        stats: {
          ...stats,
          totalInputs: newTotalInputs
        }
      })
    }
  },

  removeExploded: (id) => {
    set((state) => ({
      words: state.words.filter((w) => w.id !== id)
    }))
  }
}))
