import { GameEvent, EVENTS, EVENT_TRIGGER_CHANCE, Star } from '../../utils/constants';

export class EventManager {
  private eventQueue: GameEvent[] = [];

  shouldTriggerEvent(star: Star): boolean {
    const rand = Math.random();
    const baseProbability = EVENT_TRIGGER_CHANCE;
    const starModifier =
      star.eventProbability.black_hole +
      star.eventProbability.asteroid +
      star.eventProbability.ruins;
    const finalProbability = Math.min(0.7, baseProbability + starModifier * 0.5);
    return rand < finalProbability;
  }

  generateRandomEvent(star?: Star): GameEvent {
    let candidates = [...EVENTS];

    if (star) {
      if (star.eventProbability.black_hole > 0.1) {
        candidates = candidates.filter((e) => e.type !== 'trade');
      }
    }

    const event = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      ...event,
      id: `${event.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  queueEvent(event: GameEvent): void {
    this.eventQueue.push(event);
  }

  getNextEvent(): GameEvent | null {
    return this.eventQueue.shift() || null;
  }

  hasQueuedEvents(): boolean {
    return this.eventQueue.length > 0;
  }

  clearQueue(): void {
    this.eventQueue = [];
  }
}

export const eventManager = new EventManager();
