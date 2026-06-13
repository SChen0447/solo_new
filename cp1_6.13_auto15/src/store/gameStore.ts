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
    const { isAnimating, gameStarted, players, currentPlayerIndex, specialCells, showModal, winner } = get();
    
    if (isAnimating || !gameStarted || showModal.show || winner) return;

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

      setTimeout(() => {
        if (specialEvent) {
          const finalPlayers = updatedPlayers.map((p, i) =>
            i === currentPlayerIndex ? { ...p, position: targetPosition } : p
          );
          set({ players: finalPlayers });

          const message = specialEvent === 'ladder' 
            ? `恭喜！爬上梯子，从第${newPosition}格前进到第${targetPosition}格！`
            : `糟糕！遇到蛇了，从第${newPosition}格滑落到第${targetPosition}格！`;

          setTimeout(() => {
            set({
              isAnimating: false,
              showModal: {
                show: true,
                type: specialEvent,
                message,
                playerName: currentPlayer.name,
                from: newPosition,
                to: targetPosition
              }
            });
          }, 400);
        } else {
          const isWin = checkWin(targetPosition);
          if (isWin) {
            setTimeout(() => {
              set({
                isAnimating: false,
                winner: currentPlayer,
                showModal: {
                  show: true,
                  type: 'win',
                  message: `恭喜${currentPlayer.name}获得胜利！`,
                  playerName: currentPlayer.name,
                  from: currentPlayer.position,
                  to: BOARD_SIZE
                }
              });
            }, 400);
          } else {
            setTimeout(() => {
              set({
                isAnimating: false,
                currentPlayerIndex: getNextPlayerIndex(currentPlayerIndex, players.length)
              });
            }, 400);
          }
        }
      }, 400);
    }, 800);
  },

  closeModal: () => {
    const { showModal, currentPlayerIndex, players, winner } = get();
    
    if (showModal.type === 'win') {
      set({
        showModal: { show: false, type: null, message: '', playerName: '', from: 0, to: 0 }
      });
    } else {
      const finalPlayer = players[currentPlayerIndex];
      const isWin = checkWin(finalPlayer.position);
      
      if (isWin) {
        set({
          showModal: { show: false, type: null, message: '', playerName: '', from: 0, to: 0 },
          winner: finalPlayer,
          showModal: {
            show: true,
            type: 'win',
            message: `恭喜${finalPlayer.name}获得胜利！`,
            playerName: finalPlayer.name,
            from: finalPlayer.position,
            to: BOARD_SIZE
          }
        });
      } else {
        set({
          showModal: { show: false, type: null, message: '', playerName: '', from: 0, to: 0 },
          currentPlayerIndex: getNextPlayerIndex(currentPlayerIndex, players.length)
        });
      }
    }
  },

  resetGame: () => {
    const playerCount = get().players.length;
    get().startGame(playerCount);
  }
}));
