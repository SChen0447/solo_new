import { Server, Socket } from 'socket.io';
import { GameStateManager } from './gameState.js';
import {
  PlayerSide,
  GameAction,
  ClientGameState,
} from '../shared/types.js';

interface WaitingPlayer {
  socket: Socket;
  side: PlayerSide;
}

export function setupSocketHandler(io: Server) {
  let gameManager: GameStateManager | null = null;
  let gameLoop: NodeJS.Timeout | null = null;
  let waitingPlayer: WaitingPlayer | null = null;
  const playerSides = new Map<string, PlayerSide>();
  const playerRooms = new Map<string, string>();
  let roomIdCounter = 0;

  function broadcastState() {
    if (!gameManager) return;
    const state = gameManager.state;
    const clientState: ClientGameState = {
      ...state,
      serverTime: Date.now(),
      ping: 0,
    };
    io.emit('gameState', clientState);
  }

  function startGame(player1: Socket, player2: Socket) {
    const roomId = `game-${roomIdCounter++}`;
    player1.join(roomId);
    player2.join(roomId);
    playerRooms.set(player1.id, roomId);
    playerRooms.set(player2.id, roomId);

    gameManager = new GameStateManager(broadcastState);

    player1.emit('gameStart', { side: PlayerSide.Left });
    player2.emit('gameStart', { side: PlayerSide.Right });

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
      if (gameManager) {
        gameManager.update(16.67);
      }
    }, 16.67);

    broadcastState();
  }

  function endGame() {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
  }

  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.emit('waiting', { message: 'Waiting for opponent...' });

    if (waitingPlayer) {
      const opponent = waitingPlayer;
      waitingPlayer = null;
      playerSides.set(socket.id, PlayerSide.Right);
      playerSides.set(opponent.socket.id, PlayerSide.Left);
      startGame(opponent.socket, socket);
    } else {
      waitingPlayer = { socket, side: PlayerSide.Left };
      playerSides.set(socket.id, PlayerSide.Left);
    }

    socket.on('action', (action: GameAction) => {
      const side = playerSides.get(socket.id);
      if (!side || !gameManager) return;

      switch (action.type) {
        case 'placeTower':
          gameManager.placeTower(side, action);
          break;
        case 'upgradeTower':
          gameManager.upgradeTower(side, action);
          break;
        case 'spawnMonster':
          gameManager.spawnMonster(side, action);
          break;
      }
    });

    socket.on('restart', () => {
      if (gameManager) {
        endGame();
        gameManager.reset();
        gameLoop = setInterval(() => {
          if (gameManager) {
            gameManager.update(16.67);
          }
        }, 16.67);
        broadcastState();
      }
    });

    socket.on('ping', (timestamp: number) => {
      socket.emit('pong', timestamp);
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);

      if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
        waitingPlayer = null;
      }

      const side = playerSides.get(socket.id);
      if (side) {
        io.emit('playerDisconnected', { side });
        endGame();
        gameManager = null;
      }

      playerSides.delete(socket.id);
      playerRooms.delete(socket.id);
    });
  });
}
