import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasState,
  HistoryVersion,
  ServerMessage,
  ClientMessage,
  UserCursor,
  DrawElement,
  StickyNote,
  CanvasImage,
} from '../shared/types';

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

let canvasState: CanvasState = {
  drawings: [],
  stickies: [],
  images: [],
};

const connectedUsers = new Map<string, { ws: WebSocket; cursor: UserCursor }>();

let historyVersions: HistoryVersion[] = [];
const MAX_HISTORY_VERSIONS = 50;

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
  const hasContent =
    canvasState.drawings.length > 0 ||
    canvasState.stickies.length > 0 ||
    canvasState.images.length > 0;

  const lastVersion = historyVersions[historyVersions.length - 1];
  const isChanged =
    !lastVersion ||
    JSON.stringify(lastVersion.drawings) !== JSON.stringify(canvasState.drawings) ||
    JSON.stringify(lastVersion.stickies) !== JSON.stringify(canvasState.stickies) ||
    JSON.stringify(lastVersion.images) !== JSON.stringify(canvasState.images);

  if (hasContent && isChanged) {
    const version: HistoryVersion = {
      id: uuidv4(),
      timestamp: Date.now(),
      drawings: JSON.parse(JSON.stringify(canvasState.drawings)),
      stickies: JSON.parse(JSON.stringify(canvasState.stickies)),
      images: JSON.parse(JSON.stringify(canvasState.images)),
    };

    historyVersions.push(version);
    if (historyVersions.length > MAX_HISTORY_VERSIONS) {
      historyVersions = historyVersions.slice(-MAX_HISTORY_VERSIONS);
    }

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

  const initMsg: ServerMessage = {
    type: 'init',
    state: JSON.parse(JSON.stringify(canvasState)),
    userId,
    versions: [...historyVersions],
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
          const element: DrawElement = message.element;
          canvasState.drawings.push(element);
          broadcast({ type: 'draw', element }, userId);
          break;
        }
        case 'draw-update': {
          const element: DrawElement = message.element;
          const idx = canvasState.drawings.findIndex((d) => d.id === element.id);
          if (idx !== -1) {
            canvasState.drawings[idx] = element;
          }
          broadcast({ type: 'draw-update', element }, userId);
          break;
        }
        case 'draw-finish': {
          const element: DrawElement = message.element;
          const idx = canvasState.drawings.findIndex((d) => d.id === element.id);
          if (idx !== -1) {
            canvasState.drawings[idx] = element;
          } else {
            canvasState.drawings.push(element);
          }
          broadcast({ type: 'draw-finish', element }, userId);
          break;
        }
        case 'sticky-add': {
          const sticky: StickyNote = message.sticky;
          canvasState.stickies.push(sticky);
          broadcast({ type: 'sticky-add', sticky }, userId);
          break;
        }
        case 'sticky-update': {
          const sticky: StickyNote = message.sticky;
          const idx = canvasState.stickies.findIndex((s) => s.id === sticky.id);
          if (idx !== -1) {
            canvasState.stickies[idx] = sticky;
          }
          broadcast({ type: 'sticky-update', sticky }, userId);
          break;
        }
        case 'sticky-delete': {
          canvasState.stickies = canvasState.stickies.filter((s) => s.id !== message.id);
          broadcast({ type: 'sticky-delete', id: message.id }, userId);
          break;
        }
        case 'image-add': {
          const image: CanvasImage = message.image;
          canvasState.images.push(image);
          broadcast({ type: 'image-add', image }, userId);
          break;
        }
        case 'image-update': {
          const image: CanvasImage = message.image;
          const idx = canvasState.images.findIndex((i) => i.id === image.id);
          if (idx !== -1) {
            canvasState.images[idx] = image;
          }
          broadcast({ type: 'image-update', image }, userId);
          break;
        }
        case 'image-delete': {
          canvasState.images = canvasState.images.filter((i) => i.id !== message.id);
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
          const version = historyVersions.find((v) => v.id === message.versionId);
          if (version) {
            canvasState = {
              drawings: JSON.parse(JSON.stringify(version.drawings)),
              stickies: JSON.parse(JSON.stringify(version.stickies)),
              images: JSON.parse(JSON.stringify(version.images)),
            };
            broadcast({
              type: 'version-restore',
              state: JSON.parse(JSON.stringify(canvasState)),
              versionId: version.id,
            });
          }
          break;
        }
        case 'get-versions': {
          ws.send(JSON.stringify({ type: 'versions-list', versions: [...historyVersions] } as ServerMessage));
          break;
        }
        case 'clear-canvas': {
          canvasState = { drawings: [], stickies: [], images: [] };
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
