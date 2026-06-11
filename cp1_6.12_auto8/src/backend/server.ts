import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  ServerMessage,
  ClientMessage,
  UserCursor,
  DrawElement,
  StickyNote,
  CanvasImage,
} from '../shared/types';
import { CanvasStateManager, validateImageFile } from './canvasStateManager';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

const USER_COLORS = [
  '#ff6b35',
  '#2d6a4f',
  '#40916c',
  '#2196f3',
  '#9c27b0',
  '#e91e63',
  '#00bcd4',
  '#ff9800',
  '#673ab7',
  '#3f51b5',
];

const manager = new CanvasStateManager();
const connectedUsers = new Map<string, { ws: WebSocket; cursor: UserCursor }>();

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getRandomName(): string {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '可爱的', '神秘的', '阳光的', '酷酷的', '温柔的'];
  const nouns = ['小猫', '小狗', '小兔', '小熊', '小鸟', '海豚', '熊猫', '松鼠'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + nouns[Math.floor(Math.random() * nouns.length)];
}

function broadcast(message: ServerMessage, excludeId?: string) {
  const data = JSON.stringify(message);
  connectedUsers.forEach((user, id) => {
    if (id !== excludeId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  });
}

function saveHistoryVersion() {
  const version = manager.saveVersion();
  if (version) {
    broadcast({ type: 'version-saved', version });
  }
}

setInterval(saveHistoryVersion, 10000);

wss.on('connection', (ws: WebSocket) => {
  const userId = uuidv4();
  const userColor = getRandomColor();
  const userName = getRandomName();

  connectedUsers.set(userId, {
    ws,
    cursor: { userId, x: 0, y: 0, color: userColor, name: userName },
  });

  const state = manager.getState();
  const initMsg: ServerMessage = {
    type: 'init',
    state: JSON.parse(JSON.stringify(state)),
    userId,
    versions: [...manager.getVersions()],
  };
  ws.send(JSON.stringify(initMsg));

  broadcast(
    { type: 'user-joined', userId, color: userColor, name: userName },
    userId
  );

  ws.on('message', (rawData: string) => {
    try {
      const message: ClientMessage = JSON.parse(rawData);

      switch (message.type) {
        case 'draw': {
          manager.addDrawElement(message.element);
          broadcast({ type: 'draw', element: message.element }, userId);
          break;
        }
        case 'draw-update': {
          manager.updateDrawElement(message.element);
          broadcast({ type: 'draw-update', element: message.element }, userId);
          break;
        }
        case 'draw-finish': {
          manager.finishDrawElement(message.element);
          broadcast({ type: 'draw-finish', element: message.element }, userId);
          break;
        }
        case 'sticky-add': {
          manager.addSticky(message.sticky);
          broadcast({ type: 'sticky-add', sticky: message.sticky }, userId);
          break;
        }
        case 'sticky-update': {
          manager.updateSticky(message.sticky);
          broadcast({ type: 'sticky-update', sticky: message.sticky }, userId);
          break;
        }
        case 'sticky-delete': {
          manager.deleteSticky(message.id);
          broadcast({ type: 'sticky-delete', id: message.id }, userId);
          break;
        }
        case 'image-add': {
          manager.addImage(message.image);
          broadcast({ type: 'image-add', image: message.image }, userId);
          break;
        }
        case 'image-update': {
          manager.updateImage(message.image);
          broadcast({ type: 'image-update', image: message.image }, userId);
          break;
        }
        case 'image-delete': {
          manager.deleteImage(message.id);
          broadcast({ type: 'image-delete', id: message.id }, userId);
          break;
        }
        case 'cursor-move': {
          const user = connectedUsers.get(userId);
          if (user) {
            user.cursor = { ...message.cursor, userId, color: userColor, name: userName };
            broadcast({ type: 'cursor-move', cursor: user.cursor }, userId);
          }
          break;
        }
        case 'restore-version': {
          const hasConflict = manager.checkVersionConflict(message.expectedStateVersion);
          if (hasConflict) {
            const state = manager.getState();
            ws.send(JSON.stringify({
              type: 'version-restore-failed',
              reason: '版本冲突：当前画布状态已被修改，请刷新后重试',
            } as ServerMessage));
            ws.send(JSON.stringify({
              type: 'versions-list',
              versions: [...manager.getVersions()],
            } as ServerMessage));
            break;
          }
          const restored = manager.restoreVersion(message.versionId);
          if (restored) {
            const state = manager.getState();
            broadcast({
              type: 'version-restore',
              state: JSON.parse(JSON.stringify(state)),
              versionId: message.versionId,
              initiatorUserId: userId,
            });
          }
          break;
        }
        case 'get-versions': {
          ws.send(JSON.stringify({ type: 'versions-list', versions: [...manager.getVersions()] } as ServerMessage));
          break;
        }
        case 'clear-canvas': {
          manager.clear();
          broadcast({ type: 'clear-canvas' });
          break;
        }
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    connectedUsers.delete(userId);
    broadcast({ type: 'user-left', userId });
    broadcast({ type: 'cursor-leave', userId });
  });

  ws.on('error', (err) => {
    console.error('WebSocket error for user', userId, err);
    connectedUsers.delete(userId);
    broadcast({ type: 'user-left', userId });
    broadcast({ type: 'cursor-leave', userId });
  });
});

server.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
  console.log(`[WebSocket] ws://localhost:${PORT}`);
});
