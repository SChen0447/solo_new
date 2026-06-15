import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  color: string;
}

interface Shape {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radiusX?: number;
  radiusY?: number;
  x2?: number;
  y2?: number;
  points?: { x: number; y: number }[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  imageData?: string;
}

interface WSMessage {
  type: string;
  payload: any;
  userId?: string;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const users = new Map<string, User>();
const shapes: Shape[] = [];

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9'
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

const broadcast = (message: WSMessage, excludeId?: string) => {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const ws = client as any;
      if (ws.userId !== excludeId) {
        client.send(data);
      }
    }
  });
};

const getUsersList = () => {
  return Array.from(users.values());
};

wss.on('connection', (ws: WebSocket & { userId?: string }) => {
  const userId = uuidv4();
  ws.userId = userId;

  const userName = `用户${Math.floor(Math.random() * 1000)}`;
  const user: User = {
    id: userId,
    name: userName,
    color: getRandomColor(),
  };
  users.set(userId, user);

  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      userId,
      user,
      shapes,
      users: getUsersList(),
    },
  }));

  broadcast({
    type: 'user-join',
    payload: { user },
  }, userId);

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      message.userId = userId;

      switch (message.type) {
        case 'shape-add': {
          const shape = { ...message.payload.shape, id: uuidv4() };
          shapes.push(shape);
          broadcast({
            type: 'shape-add',
            payload: { shape, userId },
          }, userId);
          break;
        }
        case 'shape-update': {
          const { shapeId, updates } = message.payload;
          const index = shapes.findIndex((s) => s.id === shapeId);
          if (index !== -1) {
            shapes[index] = { ...shapes[index], ...updates };
            broadcast({
              type: 'shape-update',
              payload: { shapeId, updates, userId },
            }, userId);
          }
          break;
        }
        case 'shape-delete': {
          const { shapeId } = message.payload;
          const index = shapes.findIndex((s) => s.id === shapeId);
          if (index !== -1) {
            shapes.splice(index, 1);
            broadcast({
              type: 'shape-delete',
              payload: { shapeId, userId },
            }, userId);
          }
          break;
        }
        case 'shapes-sync': {
          broadcast({
            type: 'shapes-sync',
            payload: { shapes, userId },
          }, userId);
          break;
        }
        case 'cursor-move': {
          broadcast({
            type: 'cursor-move',
            payload: { ...message.payload, userId },
          }, userId);
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    users.delete(userId);
    broadcast({
      type: 'user-leave',
      payload: { userId },
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
