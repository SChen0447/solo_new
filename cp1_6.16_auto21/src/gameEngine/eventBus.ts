import type { Hero, StatusEffect } from './heroData'

export type GameEventType =
  | 'TURN_START'
  | 'TURN_END'
  | 'HERO_MOVE'
  | 'HERO_ATTACK'
  | 'SKILL_CAST'
  | 'HERO_SELECTED'
  | 'HERO_DEATH'
  | 'DAMAGE_DEALT'
  | 'HEAL_APPLIED'
  | 'STATUS_APPLIED'
  | 'GAME_OVER'
  | 'PHASE_CHANGE'

export interface GameEvent {
  type: GameEventType
  data: Record<string, unknown>
  timestamp: number
}

export type EventCallback = (event: GameEvent) => void

class EventBus {
  private subscribers: Map<GameEventType, Set<EventCallback>> = new Map()

  subscribe(eventType: GameEventType, callback: EventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }
    this.subscribers.get(eventType)!.add(callback)

    return () => {
      this.subscribers.get(eventType)?.delete(callback)
    }
  }

  unsubscribe(eventType: GameEventType, callback: EventCallback): void {
    this.subscribers.get(eventType)?.delete(callback)
  }

  publish(eventType: GameEventType, data: Record<string, unknown> = {}): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    }

    const callbacks = this.subscribers.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error('Error in event callback:', error)
        }
      })
    }

    const allCallbacks = this.subscribers.get('*' as GameEventType)
    if (allCallbacks) {
      allCallbacks.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error('Error in event callback:', error)
        }
      })
    }
  }

  clear(): void {
    this.subscribers.clear()
  }
}

export const eventBus = new EventBus()

export const publishTurnStart = (player: number, turnNumber: number) => {
  eventBus.publish('TURN_START', { player, turnNumber })
}

export const publishTurnEnd = (player: number, turnNumber: number) => {
  eventBus.publish('TURN_END', { player, turnNumber })
}

export const publishHeroMove = (hero: Hero, from: { x: number; y: number }, to: { x: number; y: number }) => {
  eventBus.publish('HERO_MOVE', { hero, from, to })
}

export const publishHeroAttack = (attacker: Hero, defender: Hero, damage: number) => {
  eventBus.publish('HERO_ATTACK', { attacker, defender, damage })
}

export const publishSkillCast = (caster: Hero, target: Hero, skillId: string, effect: StatusEffect) => {
  eventBus.publish('SKILL_CAST', { caster, target, skillId, effect })
}

export const publishHeroSelected = (hero: Hero | null) => {
  eventBus.publish('HERO_SELECTED', { hero })
}

export const publishHeroDeath = (hero: Hero) => {
  eventBus.publish('HERO_DEATH', { hero })
}

export const publishDamageDealt = (target: Hero, damage: number, source: string) => {
  eventBus.publish('DAMAGE_DEALT', { target, damage, source })
}

export const publishHealApplied = (target: Hero, amount: number, source: string) => {
  eventBus.publish('HEAL_APPLIED', { target, amount, source })
}

export const publishStatusApplied = (target: Hero, status: StatusEffect) => {
  eventBus.publish('STATUS_APPLIED', { target, status })
}

export const publishGameOver = (winner: number) => {
  eventBus.publish('GAME_OVER', { winner })
}

export const publishPhaseChange = (phase: 'move' | 'action') => {
  eventBus.publish('PHASE_CHANGE', { phase })
}
