import { create } from 'zustand'
import type { GameState, GamePhase } from '../gameEngine/gameCore'
import {
  createInitialGameState,
  selectHero,
  moveHero,
  attackTarget,
  castSkill,
  endTurn,
  setPhase,
  calculatePath
} from '../gameEngine/gameCore'
import type { Hero } from '../gameEngine/heroData'

interface GameStore extends GameState {
  uiState: {
    isTransitioning: boolean
    transitioningPlayer: number
    screenShake: { active: boolean; intensity: number }
    damageNumbers: Array<{ id: string; x: number; y: number; damage: number; isHeal: boolean; timestamp: number }>
    skillEffect: { active: boolean; type: string; caster: Hero | null; target: Hero | null }
    deathAnimations: string[]
    hoveredCell: { x: number; y: number } | null
    movePath: Array<{ x: number; y: number }>
  }
  actions: {
    selectHero: (heroId: string | null) => void
    moveHero: (heroId: string, target: { x: number; y: number }) => void
    attackTarget: (attackerId: string, targetId: string) => void
    castSkill: (casterId: string, targetId: string, skillId: string) => void
    endTurn: () => void
    setPhase: (phase: GamePhase) => void
    resetGame: () => void
    setTransitioning: (isTransitioning: boolean, player: number) => void
    setScreenShake: (active: boolean, intensity?: number) => void
    addDamageNumber: (x: number, y: number, damage: number, isHeal?: boolean) => void
    clearDamageNumbers: () => void
    showSkillEffect: (type: string, caster: Hero | null, target: Hero | null) => void
    hideSkillEffect: () => void
    addDeathAnimation: (heroId: string) => void
    removeDeathAnimation: (heroId: string) => void
    setHoveredCell: (cell: { x: number; y: number } | null) => void
    updateMovePath: (path: Array<{ x: number; y: number }>) => void
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),

  uiState: {
    isTransitioning: false,
    transitioningPlayer: 1,
    screenShake: { active: false, intensity: 0 },
    damageNumbers: [],
    skillEffect: { active: false, type: '', caster: null, target: null },
    deathAnimations: [],
    hoveredCell: null,
    movePath: []
  },

  actions: {
    selectHero: (heroId: string | null) => {
      const state = get()
      const newState = selectHero(state, heroId)
      set(newState)
    },

    moveHero: (heroId: string, target: { x: number; y: number }) => {
      const state = get()
      const newState = moveHero(state, heroId, target)
      set(newState)
    },

    attackTarget: (attackerId: string, targetId: string) => {
      const state = get()
      const newState = attackTarget(state, attackerId, targetId)
      set(newState)
    },

    castSkill: (casterId: string, targetId: string, skillId: string) => {
      const state = get()
      const newState = castSkill(state, casterId, targetId, skillId)
      set(newState)
    },

    endTurn: () => {
      const state = get()
      const newState = endTurn(state)
      set(newState)
    },

    setPhase: (phase: GamePhase) => {
      const state = get()
      const newState = setPhase(state, phase)
      set(newState)
    },

    resetGame: () => {
      set({
        ...createInitialGameState(),
        uiState: {
          isTransitioning: false,
          transitioningPlayer: 1,
          screenShake: { active: false, intensity: 0 },
          damageNumbers: [],
          skillEffect: { active: false, type: '', caster: null, target: null },
          deathAnimations: [],
          hoveredCell: null,
          movePath: []
        }
      })
    },

    setTransitioning: (isTransitioning: boolean, player: number) => {
      set(state => ({
        uiState: { ...state.uiState, isTransitioning, transitioningPlayer: player }
      }))
    },

    setScreenShake: (active: boolean, intensity: number = 5) => {
      set(state => ({
        uiState: { ...state.uiState, screenShake: { active, intensity } }
      }))
    },

    addDamageNumber: (x: number, y: number, damage: number, isHeal: boolean = false) => {
      const id = `${Date.now()}-${Math.random()}`
      set(state => ({
        uiState: {
          ...state.uiState,
          damageNumbers: [...state.uiState.damageNumbers, { id, x, y, damage, isHeal, timestamp: Date.now() }]
        }
      }))
    },

    clearDamageNumbers: () => {
      const now = Date.now()
      set(state => ({
        uiState: {
          ...state.uiState,
          damageNumbers: state.uiState.damageNumbers.filter(d => now - d.timestamp < 1500)
        }
      }))
    },

    showSkillEffect: (type: string, caster: Hero | null, target: Hero | null) => {
      set(state => ({
        uiState: {
          ...state.uiState,
          skillEffect: { active: true, type, caster, target }
        }
      }))
    },

    hideSkillEffect: () => {
      set(state => ({
        uiState: {
          ...state.uiState,
          skillEffect: { active: false, type: '', caster: null, target: null }
        }
      }))
    },

    addDeathAnimation: (heroId: string) => {
      set(state => ({
        uiState: {
          ...state.uiState,
          deathAnimations: [...state.uiState.deathAnimations, heroId]
        }
      }))
    },

    removeDeathAnimation: (heroId: string) => {
      set(state => ({
        uiState: {
          ...state.uiState,
          deathAnimations: state.uiState.deathAnimations.filter(id => id !== heroId)
        }
      }))
    },

    setHoveredCell: (cell: { x: number; y: number } | null) => {
      const state = get()
      if (!cell) {
        set(state => ({
          uiState: { ...state.uiState, hoveredCell: null, movePath: [] }
        }))
        return
      }

      if (state.selectedHeroId) {
        const selectedHero = state.heroes.find(h => h.id === state.selectedHeroId)
        if (selectedHero && !selectedHero.hasMoved) {
          const isMoveable = state.moveableCells.some(c => c.x === cell.x && c.y === cell.y)
          if (isMoveable) {
            const path = calculatePath(selectedHero, cell, state.heroes)
            set(state => ({
              uiState: { ...state.uiState, hoveredCell: cell, movePath: path }
            }))
            return
          }
        }
      }

      set(state => ({
        uiState: { ...state.uiState, hoveredCell: cell, movePath: [] }
      }))
    },

    updateMovePath: (path: Array<{ x: number; y: number }>) => {
      set(state => ({
        uiState: { ...state.uiState, movePath: path }
      }))
    }
  }
}))

export const useHeroes = () => useGameStore(state => state.heroes)
export const useCurrentPlayer = () => useGameStore(state => state.currentPlayer)
export const useTurnNumber = () => useGameStore(state => state.turnNumber)
export const usePhase = () => useGameStore(state => state.phase)
export const useSelectedHeroId = () => useGameStore(state => state.selectedHeroId)
export const useSelectedHero = () => {
  const heroes = useHeroes()
  const selectedId = useSelectedHeroId()
  return heroes.find(h => h.id === selectedId) || null
}
export const useGameStatus = () => useGameStore(state => state.status)
export const useWinner = () => useGameStore(state => state.winner)
export const useMoveableCells = () => useGameStore(state => state.moveableCells)
export const useAttackableTargets = () => useGameStore(state => state.attackableTargets)
export const useUIState = () => useGameStore(state => state.uiState)
export const useGameActions = () => useGameStore(state => state.actions)
