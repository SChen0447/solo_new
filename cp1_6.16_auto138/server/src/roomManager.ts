import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import { GameState, Player, PLAYER_COLORS } from './types';
import {
  createInitialState,
  createPlayer,
  drawPixel,
  placeItem,
  startRound,
  submitVote,
  allVoted,
  calculateRoundScores,
  tickTimer
} from './gameEngine';

export class RoomManager {
  private rooms: Map<string, GameState> = new Map();
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(hostName: string, socket: Socket): { roomId: string; playerId: string } {
    const roomId = uuidv4().substring(0, 6);
    const playerId = uuidv4();
    const state = createInitialState(roomId, playerId);
    const color = PLAYER_COLORS[0];
    const player = createPlayer(playerId, socket.id, hostName, color);
    state.players[playerId] = player;
    this.rooms.set(roomId, state);
    socket.join(roomId);
    return { roomId, playerId };
  }

  joinRoom(roomId: string, playerName: string, socket: Socket): { playerId: string; state: GameState } | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    const playerCount = Object.keys(state.players).length;
    if (playerCount >= 4 || state.phase !== 'waiting') return null;

    const usedColors = Object.values(state.players).map(p => p.color);
    const availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c)) || PLAYER_COLORS[playerCount % PLAYER_COLORS.length];

    const playerId = uuidv4();
    const player = createPlayer(playerId, socket.id, playerName, availableColor);
    state.players[playerId] = player;
    socket.join(roomId);

    return { playerId, state };
  }

  leaveRoom(roomId: string, playerId: string): void {
    const state = this.rooms.get(roomId);
    if (!state) return;

    delete state.players[playerId];

    if (Object.keys(state.players).length === 0) {
      this.rooms.delete(roomId);
      const timer = this.timers.get(roomId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(roomId);
      }
    } else if (state.hostId === playerId) {
      state.hostId = Object.keys(state.players)[0];
    }

    this.broadcastState(roomId);
  }

  getState(roomId: string): GameState | undefined {
    return this.rooms.get(roomId);
  }

  handleDrawPixel(roomId: string, playerId: string, x: number, y: number, colorIndex: number): boolean {
    const state = this.rooms.get(roomId);
    if (!state || state.phase !== 'playing') return false;

    const result = drawPixel(state, playerId, x, y, colorIndex);
    if (result.success) {
      this.io.to(roomId).emit('pixelDrawn', { x, y, colorIndex, playerId, triggeredItem: result.triggeredItem });
      this.broadcastPlayers(roomId);
    }
    return result.success;
  }

  handlePlaceItem(roomId: string, playerId: string, x: number, y: number, itemType: 'trap' | 'speedBoost'): boolean {
    const state = this.rooms.get(roomId);
    if (!state || state.phase !== 'playing') return false;

    const result = placeItem(state, playerId, x, y, itemType);
    if (result.success && result.item && itemType === 'trap') {
      this.io.to(roomId).emit('itemPlaced', { item: result.item, playerId });
    }
    if (result.success) {
      this.broadcastPlayers(roomId);
    }
    return result.success;
  }

  handleStartGame(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId);
    if (!state) return false;
    if (state.hostId !== playerId) return false;
    if (Object.keys(state.players).length < 2) return false;

    startRound(state);
    this.startTimer(roomId);
    this.broadcastState(roomId);
    return true;
  }

  handleVote(roomId: string, voterId: string, targetId: string, score: number): boolean {
    const state = this.rooms.get(roomId);
    if (!state) return false;

    const success = submitVote(state, voterId, targetId, score);
    if (success) {
      this.broadcastPlayers(roomId);
      if (allVoted(state)) {
        calculateRoundScores(state);
        if (state.round >= 3) {
          state.phase = 'results';
          const timer = this.timers.get(roomId);
          if (timer) {
            clearInterval(timer);
            this.timers.delete(roomId);
          }
        } else {
          setTimeout(() => {
            startRound(state);
            this.broadcastState(roomId);
          }, 5000);
          state.phase = 'results';
        }
        this.broadcastState(roomId);
      }
    }
    return success;
  }

  handleSetDrawing(roomId: string, playerId: string, isDrawing: boolean): void {
    const state = this.rooms.get(roomId);
    if (!state) return;
    const player = state.players[playerId];
    if (!player) return;
    player.isDrawing = isDrawing;
    this.io.to(roomId).emit('playerDrawing', { playerId, isDrawing });
  }

  handleNextRound(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId);
    if (!state || state.hostId !== playerId) return false;
    if (state.phase !== 'results' || state.round >= 3) return false;
    startRound(state);
    this.broadcastState(roomId);
    return true;
  }

  private startTimer(roomId: string): void {
    const existingTimer = this.timers.get(roomId);
    if (existingTimer) clearInterval(existingTimer);

    const timer = setInterval(() => {
      const state = this.rooms.get(roomId);
      if (!state) {
        clearInterval(timer);
        this.timers.delete(roomId);
        return;
      }
      tickTimer(state);
      this.io.to(roomId).emit('timerTick', { timeLeft: state.timeLeft, phase: state.phase });
      if (state.phase === 'voting') {
        clearInterval(timer);
        this.timers.delete(roomId);
        this.broadcastState(roomId);
      }
    }, 1000);
    this.timers.set(roomId, timer);
  }

  private broadcastState(roomId: string): void {
    const state = this.rooms.get(roomId);
    if (state) {
      this.io.to(roomId).emit('gameState', this.sanitizeState(state));
    }
  }

  private broadcastPlayers(roomId: string): void {
    const state = this.rooms.get(roomId);
    if (state) {
      this.io.to(roomId).emit('playersUpdate', { players: state.players });
    }
  }

  private sanitizeState(state: GameState): Partial<GameState> {
    return {
      roomId: state.roomId,
      phase: state.phase,
      round: state.round,
      theme: state.theme,
      timeLeft: state.timeLeft,
      canvas: state.canvas,
      pixelOwners: state.pixelOwners,
      players: state.players,
      items: state.items,
      hostId: state.hostId
    };
  }
}
