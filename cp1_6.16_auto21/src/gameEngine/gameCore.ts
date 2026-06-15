import type { Hero, StatusEffect, Player, Skill } from './heroData'
import { createStatusEffect, getInitialHeroes } from './heroData'
import {
  publishTurnStart,
  publishTurnEnd,
  publishHeroMove,
  publishHeroAttack,
  publishSkillCast,
  publishHeroDeath,
  publishDamageDealt,
  publishHealApplied,
  publishStatusApplied,
  publishGameOver,
  publishPhaseChange
} from './eventBus'

export type GamePhase = 'move' | 'action'
export type GameStatus = 'playing' | 'paused' | 'finished'

export interface GameState {
  heroes: Hero[]
  currentPlayer: Player
  turnNumber: number
  phase: GamePhase
  selectedHeroId: string | null
  status: GameStatus
  winner: Player | null
  moveableCells: { x: number; y: number }[]
  attackableTargets: string[]
}

export const GRID_WIDTH = 10
export const GRID_HEIGHT = 7

const manhattanDistance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

const getHeroAt = (heroes: Hero[], x: number, y: number): Hero | undefined => {
  return heroes.find(h => h.position.x === x && h.position.y === y && h.currentHp > 0)
}

const calculateMoveableCells = (hero: Hero, heroes: Hero[]): { x: number; y: number }[] => {
  const cells: { x: number; y: number }[] = []
  const visited = new Set<string>()
  const queue: { x: number; y: number; dist: number }[] = [{ ...hero.position, dist: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue
    visited.add(key)

    if (current.dist > 0 && !getHeroAt(heroes, current.x, current.y)) {
      cells.push({ x: current.x, y: current.y })
    }

    if (current.dist < hero.moveRange) {
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ]

      for (const dir of directions) {
        const nx = current.x + dir.dx
        const ny = current.y + dir.dy

        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          const occupyingHero = getHeroAt(heroes, nx, ny)
          if (!occupyingHero || occupyingHero.player === hero.player) {
            queue.push({ x: nx, y: ny, dist: current.dist + 1 })
          }
        }
      }
    }
  }

  return cells
}

const calculateAttackableTargets = (hero: Hero, heroes: Hero[]): string[] => {
  return heroes
    .filter(
      h =>
        h.player !== hero.player &&
        h.currentHp > 0 &&
        manhattanDistance(hero.position, h.position) <= hero.attackRange
    )
    .map(h => h.id)
}

const calculateDamage = (attacker: Hero, defender: Hero): number => {
  const baseDamage = attacker.attack
  const defense = defender.defense

  const shieldEffect = defender.statusEffects.find(e => e.type === 'shield')
  const damageReduction = shieldEffect?.damageReduction || 0

  const rawDamage = Math.max(1, baseDamage - defense * 0.5)
  const finalDamage = Math.round(rawDamage * (1 - damageReduction / 100))

  return Math.max(1, finalDamage)
}

const applyStatusEffects = (hero: Hero): { damage: number; heal: number } => {
  let totalDamage = 0
  let totalHeal = 0

  for (const effect of hero.statusEffects) {
    if (effect.type === 'burn' && effect.damagePerTurn) {
      totalDamage += effect.damagePerTurn
    }
    if (effect.type === 'heal' && effect.healPerTurn) {
      totalHeal += effect.healPerTurn
    }
  }

  return { damage: totalDamage, heal: totalHeal }
}

const decrementStatusEffects = (hero: Hero): StatusEffect[] => {
  return hero.statusEffects
    .map(effect => ({ ...effect, duration: effect.duration - 1 }))
    .filter(effect => effect.duration > 0)
}

const decrementSkillCooldowns = (hero: Hero): Skill[] => {
  return hero.skills.map(skill => ({
    ...skill,
    currentCooldown: Math.max(0, skill.currentCooldown - 1)
  }))
}

export const createInitialGameState = (): GameState => {
  const heroes = getInitialHeroes()
  return {
    heroes,
    currentPlayer: 1,
    turnNumber: 1,
    phase: 'move',
    selectedHeroId: null,
    status: 'playing',
    winner: null,
    moveableCells: [],
    attackableTargets: []
  }
}

export const selectHero = (state: GameState, heroId: string | null): GameState => {
  if (!heroId) {
    return { ...state, selectedHeroId: null, moveableCells: [], attackableTargets: [] }
  }

  const hero = state.heroes.find(h => h.id === heroId)
  if (!hero || hero.player !== state.currentPlayer || hero.currentHp <= 0) {
    return state
  }

  const moveableCells = hero.hasMoved ? [] : calculateMoveableCells(hero, state.heroes)
  const attackableTargets = hero.hasActed ? [] : calculateAttackableTargets(hero, state.heroes)

  return {
    ...state,
    selectedHeroId: heroId,
    moveableCells,
    attackableTargets
  }
}

export const moveHero = (state: GameState, heroId: string, target: { x: number; y: number }): GameState => {
  const hero = state.heroes.find(h => h.id === heroId)
  if (!hero || hero.hasMoved || hero.currentHp <= 0) return state

  const isMoveable = state.moveableCells.some(c => c.x === target.x && c.y === target.y)
  if (!isMoveable) return state

  const fromPosition = { ...hero.position }
  const updatedHeroes = state.heroes.map(h =>
    h.id === heroId
      ? { ...h, position: { ...target }, hasMoved: true }
      : h
  )

  const movedHero = updatedHeroes.find(h => h.id === heroId)!
  publishHeroMove(movedHero, fromPosition, target)

  const newAttackableTargets = movedHero.hasActed
    ? []
    : calculateAttackableTargets(movedHero, updatedHeroes)

  return {
    ...state,
    heroes: updatedHeroes,
    moveableCells: [],
    attackableTargets: newAttackableTargets,
    phase: 'action'
  }
}

export const attackTarget = (state: GameState, attackerId: string, targetId: string): GameState => {
  const attacker = state.heroes.find(h => h.id === attackerId)
  const target = state.heroes.find(h => h.id === targetId)

  if (!attacker || !target || attacker.hasActed || attacker.currentHp <= 0 || target.currentHp <= 0) {
    return state
  }

  const isAttackable = state.attackableTargets.includes(targetId)
  if (!isAttackable) return state

  const damage = calculateDamage(attacker, target)
  const newHp = Math.max(0, target.currentHp - damage)

  let updatedHeroes = state.heroes.map(h => {
    if (h.id === attackerId) {
      return { ...h, hasActed: true }
    }
    if (h.id === targetId) {
      return { ...h, currentHp: newHp }
    }
    return h
  })

  publishHeroAttack(attacker, { ...target, currentHp: newHp }, damage)
  publishDamageDealt({ ...target, currentHp: newHp }, damage, 'attack')

  const updatedTarget = updatedHeroes.find(h => h.id === targetId)!
  if (updatedTarget.currentHp <= 0) {
    publishHeroDeath(updatedTarget)
  }

  let newState = {
    ...state,
    heroes: updatedHeroes,
    attackableTargets: []
  }

  newState = checkGameOver(newState)

  return newState
}

export const castSkill = (
  state: GameState,
  casterId: string,
  targetId: string,
  skillId: string
): GameState => {
  const caster = state.heroes.find(h => h.id === casterId)
  const target = state.heroes.find(h => h.id === targetId)
  const skill = caster?.skills.find(s => s.id === skillId)

  if (!caster || !target || !skill || caster.hasActed || caster.currentHp <= 0 || target.currentHp <= 0) {
    return state
  }

  if (skill.currentCooldown > 0) return state

  const distance = manhattanDistance(caster.position, target.position)
  if (distance > skill.range) return state

  const isFriendlySkill = skill.effect === 'shield' || skill.effect === 'heal'
  if (isFriendlySkill && target.player !== caster.player) return state
  if (!isFriendlySkill && target.player === caster.player) return state

  const statusEffect = createStatusEffect(skill.effect, skill.effectDuration, skill.effectValue)

  let updatedHeroes = state.heroes.map(h => {
    if (h.id === casterId) {
      const updatedSkills = h.skills.map(s =>
        s.id === skillId ? { ...s, currentCooldown: s.cooldown } : s
      )
      return { ...h, skills: updatedSkills, hasActed: true }
    }
    if (h.id === targetId) {
      const newEffects = [...h.statusEffects.filter(e => e.type !== skill.effect), statusEffect]
      return { ...h, statusEffects: newEffects }
    }
    return h
  })

  const updatedTarget = updatedHeroes.find(h => h.id === targetId)!
  publishSkillCast(caster, updatedTarget, skillId, statusEffect)
  publishStatusApplied(updatedTarget, statusEffect)

  let newState = {
    ...state,
    heroes: updatedHeroes,
    attackableTargets: []
  }

  return newState
}

export const endTurn = (state: GameState): GameState => {
  if (state.status !== 'playing') return state

  publishTurnEnd(state.currentPlayer, state.turnNumber)

  const nextPlayer: Player = state.currentPlayer === 1 ? 2 : 1
  const nextTurnNumber = nextPlayer === 1 ? state.turnNumber + 1 : state.turnNumber

  let updatedHeroes = state.heroes.map(hero => {
    if (hero.currentHp <= 0) return hero

    if (hero.player === nextPlayer) {
      const { damage, heal } = applyStatusEffects(hero)
      let newHp = hero.currentHp - damage + heal
      newHp = Math.max(0, Math.min(hero.maxHp, newHp))

      if (damage > 0) {
        publishDamageDealt({ ...hero, currentHp: newHp }, damage, 'burn')
      }
      if (heal > 0) {
        publishHealApplied({ ...hero, currentHp: newHp }, heal, 'heal')
      }

      const newEffects = decrementStatusEffects({ ...hero, currentHp: newHp })
      const newSkills = decrementSkillCooldowns({ ...hero, currentHp: newHp })

      if (newHp <= 0) {
        const deadHero = { ...hero, currentHp: 0, statusEffects: newEffects, skills: newSkills }
        publishHeroDeath(deadHero)
        return deadHero
      }

      return {
        ...hero,
        currentHp: newHp,
        statusEffects: newEffects,
        skills: newSkills,
        hasMoved: false,
        hasActed: false
      }
    }

    return hero
  })

  let newState: GameState = {
    ...state,
    heroes: updatedHeroes,
    currentPlayer: nextPlayer,
    turnNumber: nextTurnNumber,
    phase: 'move',
    selectedHeroId: null,
    moveableCells: [],
    attackableTargets: []
  }

  newState = checkGameOver(newState)

  if (newState.status === 'playing') {
    publishTurnStart(nextPlayer, nextTurnNumber)
    publishPhaseChange('move')
  }

  return newState
}

export const setPhase = (state: GameState, phase: GamePhase): GameState => {
  publishPhaseChange(phase)
  return { ...state, phase }
}

const checkGameOver = (state: GameState): GameState => {
  const player1Alive = state.heroes.some(h => h.player === 1 && h.currentHp > 0)
  const player2Alive = state.heroes.some(h => h.player === 2 && h.currentHp > 0)

  if (!player1Alive) {
    publishGameOver(2)
    return { ...state, status: 'finished', winner: 2 }
  }
  if (!player2Alive) {
    publishGameOver(1)
    return { ...state, status: 'finished', winner: 1 }
  }

  return state
}

export const canCurrentPlayerEndTurn = (state: GameState): boolean => {
  const currentPlayerHeroes = state.heroes.filter(
    h => h.player === state.currentPlayer && h.currentHp > 0
  )
  return currentPlayerHeroes.every(h => h.hasActed || h.hasMoved) || true
}

export const calculatePath = (
  hero: Hero,
  target: { x: number; y: number },
  heroes: Hero[]
): { x: number; y: number }[] => {
  const queue: { pos: { x: number; y: number }; path: { x: number; y: number }[] }[] = [
    { pos: hero.position, path: [hero.position] }
  ]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    const key = `${current.pos.x},${current.pos.y}`

    if (visited.has(key)) continue
    visited.add(key)

    if (current.pos.x === target.x && current.pos.y === target.y) {
      return current.path
    }

    if (current.path.length - 1 < hero.moveRange) {
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ]

      for (const dir of directions) {
        const nx = current.pos.x + dir.dx
        const ny = current.pos.y + dir.dy

        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
          const occupyingHero = getHeroAt(heroes, nx, ny)
          if (!occupyingHero || (nx === target.x && ny === target.y)) {
            queue.push({
              pos: { x: nx, y: ny },
              path: [...current.path, { x: nx, y: ny }]
            })
          }
        }
      }
    }
  }

  return []
}
