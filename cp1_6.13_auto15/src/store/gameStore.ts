import { create } from 'zustand';
import {
  Player,
  rollDice,
  createInitialPlayers,
  calculateNewPosition,
  checkWin,
  getNextPlayerIndex,
  generateSpecialCells,
  BOARD_SIZE
} from '@/utils/gameLogic';

interface ModalState {
  show: boolean;
  type: 'ladder' | 'snake' | 'win' | null;
  message: string;
  playerName: string;
  from: number;
  to: number;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceResult: number | null;
  isAnimating: boolean;
  gameStarted: boolean;
  showModal: ModalState;
  winner: Player | null;
  specialCells: Map<number, number>;
  startGame: (playerCount: number) => void;
  rollDiceAction: () => void;
  closeModal: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  currentPlayerIndex: 0,
  diceResult: null,
  isAnimating: false,
  gameStarted: false,
  showModal: {
    show: false,
    type: null,
    message: '',
    playerName: '',
    from: 0,
    to: 0
  },
  winner: null,
  specialCells: new Map(),

  startGame: (playerCount: number) => {
    const players = createInitialPlayers(playerCount);
    const specialCells = generateSpecialCells();
    set({
      players,
      currentPlayerIndex: 0,
      diceResult: null,
      isAnimating: false,
      gameStarted: true,
      showModal: { show: false, type: null, message: '', playerName: '', from: 0, to: 0 },
      winner: null,
      specialCells
    });
  },

  rollDiceAction: () => {
    const { isAnimating, gameStarted, players, currentPlayerIndex, specialCells, showModal } = get();
    
    if (isAnimating || !gameStarted || showModal.show) return;

    const diceValue = rollDice();
    const currentPlayer = players[currentPlayerIndex];
    const { newPosition, specialEvent, targetPosition } = calculateNewPosition(
      currentPlayer.position,
      diceValue,
      specialCells
    );

    set({ diceResult: diceValue, isAnimating: true });

    setTimeout(() => {
      const updatedPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, position: newPosition } : p
      );
      set({ players: updatedPlayers });

