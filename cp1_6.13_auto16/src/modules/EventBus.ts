type EventCallback = (...args: any[]) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (!this.listeners.has(event)) return;
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners.has(event)) return;
    const callbacks = [...this.listeners.get(event)!];
    for (const cb of callbacks) {
      cb(...args);
    }
  }

  once(event: string, callback: EventCallback): void {
    const wrapper = (...args: any[]) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const GameEvents = {
  BATTLE_START: 'battle:start',
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  CARD_PLAYED: 'card:played',
  CARD_DRAWN: 'card:drawn',
  DAMAGE_DEALT: 'damage:dealt',
  ARMOR_GAINED: 'armor:gained',
  CARDS_DRAWN: 'cards:drawn',
  PLAYER_UPDATE: 'player:update',
  ENEMY_UPDATE: 'enemy:update',
  HAND_CHANGED: 'hand:changed',
  ENERGY_CHANGED: 'energy:changed',
  GAME_OVER: 'game:over',
  UI_ANIMATE_CARD: 'ui:animate:card',
  UI_SHOW_FLOATTEXT: 'ui:show:floattext',
  UI_SHOW_TURNBANNER: 'ui:show:turnbanner',
  UI_RESTART: 'ui:restart',
  PLAYER_PLAY_CARD: 'player:play:card',
  AI_DECIDE: 'ai:decide',
};
