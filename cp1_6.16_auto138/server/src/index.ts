import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './roomManager';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', ({ playerName }, callback) => {
    try {
      const { roomId, playerId } = roomManager.createRoom(playerName, socket);
      callback({ success: true, roomId, playerId });
      const state = roomManager.getState(roomId);
      if (state) {
        io.to(roomId).emit('gameState', {
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
        });
      }
    } catch (err) {
      callback({ success: false, error: 'Failed to create room' });
    }
  });

  socket.on('joinRoom', ({ roomId, playerName }, callback) => {
    try {
      const result = roomManager.joinRoom(roomId, playerName, socket);
      if (!result) {
        callback({ success: false, error: 'Room not found or full' });
        return;
      }
      callback({ success: true, playerId: result.playerId });
      const state = roomManager.getState(roomId);
      if (state) {
        io.to(roomId).emit('gameState', {
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
        });
      }
    } catch (err) {
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  socket.on('leaveRoom', ({ roomId, playerId }) => {
    roomManager.leaveRoom(roomId, playerId);
  });

  socket.on('drawPixel', ({ roomId, playerId, x, y, colorIndex }) => {
    roomManager.handleDrawPixel(roomId, playerId, x, y, colorIndex);
  });

  socket.on('placeItem', ({ roomId, playerId, x, y, itemType }, callback) => {
    const success = roomManager.handlePlaceItem(roomId, playerId, x, y, itemType);
    callback({ success });
  });

  socket.on('startGame', ({ roomId, playerId }, callback) => {
    const success = roomManager.handleStartGame(roomId, playerId);
    callback({ success });
  });

  socket.on('submitVote', ({ roomId, voterId, targetId, score }, callback) => {
    const success = roomManager.handleVote(roomId, voterId, targetId, score);
    callback({ success });
  });

  socket.on('setDrawing', ({ roomId, playerId, isDrawing }) => {
    roomManager.handleSetDrawing(roomId, playerId, isDrawing);
  });

  socket.on('nextRound', ({ roomId, playerId }, callback) => {
    const success = roomManager.handleNextRound(roomId, playerId);
    callback({ success });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
