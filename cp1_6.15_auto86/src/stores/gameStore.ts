import { create } from 'zustand'

export interface PlayerState {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  opacity: number
}

export interface GameState {
  player: PlayerState
  rewindTime: number
  maxRewindTime: number
  gems: number
  totalGems: number
  gameTime: number
  isRewinding: boolean
  isDead: boolean
  isRespawning: boolean
  isVictory: boolean
  isPaused: boolean
  screenShake: { x: number; y: number; duration: number }
  input: {
    left: boolean
    right: boolean
    jump: boolean
    rewind: boolean
  }
  setPlayerPosition: (x: number, y: number) => void
  setPlayerVelocity: (vx: number, vy: number) => void
  setPlayerColor: (color: string) => void
  setPlayerOpacity: (opacity: number) => void
  setRewindTime: (time: number) => void
  setIsRewinding: (isRewinding: boolean) => void
  setIsDead: (isDead: boolean) => void
  setIsRespawning: (isRespawning: boolean) => void
  setIsVictory: (isVictory: boolean) => void
  setIsPaused: (isPaused: boolean) => void
  setGameTime: (time: number) => void
  setInput: (input: Partial<GameState['input']>) => void
  addGem: () => void
  triggerScreenShake: (x: number, y: number, duration: number) => void
  resetGame: () => void
}

const INITIAL_PLAYER: PlayerState = {
  x: 100,
  y: 350,
  vx: 0,
  vy: 0,
  color: '#ff4500',
  opacity: 1
}

export const useGameStore = create<GameState>((set) => ({
  player: { ...INITIAL_PLAYER },
  rewindTime: 5,
  maxRewindTime: 5,
  gems: 0,
  totalGems: 10,
  gameTime: 0,
  isRewinding: false,
  isDead: false,
  isRespawning: false,
  isVictory: false,
  isPaused: false,
  screenShake: { x: 0, y: 0, duration: 0 },
  input: {
    left: false,
    right: false,
    jump: false,
    rewind: false
  },
  setPlayerPosition: (x, y) =>
    set((state) => ({ player: { ...state.player, x, y } })),
  setPlayerVelocity: (vx, vy) =>
    set((state) => ({ player: { ...state.player, vx, vy } })),
  setPlayerColor: (color) =>
    set((state) => ({ player: { ...state.player, color } })),
  setPlayerOpacity: (opacity) =>
    set((state) => ({ player: { ...state.player, opacity } })),
  setRewindTime: (time) => set({ rewindTime: time }),
  setIsRewinding: (isRewinding) => set({ isRewinding }),
  setIsDead: (isDead) => set({ isDead }),
  setIsRespawning: (isRespawning) => set({ isRespawning }),
  setIsVictory: (isVictory) => set({ isVictory }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setGameTime: (time) => set({ gameTime: time }),
  setInput: (input) =>
    set((state) => ({ input: { ...state.input, ...input } })),
  addGem: () =>
    set((state) => {
      const newGems = state.gems + 1
      return {
        gems: newGems,
        isVictory: newGems >= state.totalGems
      }
    }),
  triggerScreenShake: (x, y, duration) =>
    set({ screenShake: { x, y, duration } }),
  resetGame: () =>
    set({
      player: { ...INITIAL_PLAYER },
      rewindTime: 5,
      gems: 0,
      gameTime: 0,
      isRewinding: false,
      isDead: false,
      isRespawning: false,
      isVictory: false,
      isPaused: false,
      screenShake: { x: 0, y: 0, duration: 0 },
      input: { left: false, right: false, jump: false, rewind: false }
    })
}))
