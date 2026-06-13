import { EventBus, GameEvents } from './EventBus';
import { getCardById, createDefaultDeck } from './CardSystem';

export interface PlayerState {
  id: 'player' | 'enemy';
  name: string;
  maxHp: number;
  hp: number;
  armor: number;
  maxEnergy: number;
  energy: number;
  energyCap: number;
  deck: string[];
  hand: string[];
  discard: string[];
  handLimit: number;
}

export class PlayerManager {
  private eventBus: EventBus;
  private player: PlayerState;
  private enemy: PlayerState;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.player = this.createInitialState('player', '光翼使者');
    this.enemy = this.createInitialState('enemy', '暗影法师');
  }

  private createInitialState(id: 'player' | 'enemy', name: string): PlayerState {
    return {
      id,
      name,
      maxHp: 30,
      hp: 30,
      armor: 0,
      maxEnergy: 10,
      energy: 3,
      energyCap: 10,
      deck: this.shuffle([...createDefaultDeck()]),
      hand: [],
      discard: [],
      handLimit: 7,
    };
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getPlayer(): PlayerState {
    return { ...this.player };
  }

  getEnemy(): PlayerState {
    return { ...this.enemy };
  }

  getState(who: 'player' | 'enemy'): PlayerState {
    return who === 'player' ? { ...this.player } : { ...this.enemy };
  }

  resetGame(): void {
    this.player = this.createInitialState('player', '光翼使者');
    this.enemy = this.createInitialState('enemy', '暗影法师');
    this.emitPlayerUpdate();
    this.emitEnemyUpdate();
  }

  drawCards(who: 'player' | 'enemy', count: number): string[] {
    const state = who === 'player' ? this.player : this.enemy;
    const drawn: string[] = [];

    for (let i = 0; i < count; i++) {
      if (state.hand.length >= state.handLimit) break;

      if (state.deck.length === 0) {
        if (state.discard.length === 0) break;
        state.deck = this.shuffle(state.discard);
        state.discard = [];
      }

      const cardId = state.deck.pop();
      if (cardId) {
        state.hand.push(cardId);
        drawn.push(cardId);
      }
    }

    this.emitUpdate(who);
    this.emitHandChanged(who);

    if (drawn.length > 0) {
      this.eventBus.emit(GameEvents.CARDS_DRAWN, { who, count: drawn.length, cards: drawn });
    }

    return drawn;
  }

  playCard(who: 'player' | 'enemy', cardId: string): boolean {
    const state = who === 'player' ? this.player : this.enemy;
    const card