import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  WSMessage,
  JoinPayload,
  ContentUpdatePayload,
  CursorUpdatePayload,
  ChatPayload,
  SaveVersionPayload,
  RevertVersionPayload,
  InitPayload,
  UserListPayload,
  VersionListPayload,
} from '../types';
import {
  createRoom,
  getRoom,
  roomExists,
  updateDocument,
  addUser,
  removeUser,
  getUsers,
  updateCursor,
  saveVersion,
  getVersions,
  revertVersion,
} from './documentStore';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

app.get('/api/room/:roomId/exists', (req, res) => {
  const { roomId } = req.params;
  res.json({ exists: roomExists(roomId) });
});

app.post('/api/room', (req, res) => {
  const { nickname } = req.body;
  if (!nickname) {
    return res.status(400).json({ error: '昵称不能为空' });
  }
  const { roomId } = createRoom();
  const userId = uuidv4();
  res.json({ roomId, userId });
});

app.get('/api/room/:roomId/versions', (req, res) => {
  const { roomId } = req.params;
  const versions = getVersions(roomId);
  res.json({ versions });
});

interface WebSocketExt extends WebSocket {
  roomId?: string;
  userId?: string;
  nickname?: string;
}

function broadcastToRoom(roomId: string, message: WSMessage, excludeUserId?: string) {
  const room = getRoom(roomId);
  if (!room) return;
  
  wss.clients.forEach((client) => {
    const extClient = client as WebSocketExt;
    if (
      extClient.readyState === WebSocket.OPEN &&
      extClient.roomId === roomId &&
      extClient.userId !== excludeUserId
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

function sendMessage(client: WebSocket, type: string, roomId: string, userId: string, payload: any) {
  const message: WSMessage = { type: type as any, roomId, userId, payload };
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

function sendUserListUpdate(roomId: string) {
  const users = getUsers(roomId);
  const payload: UserListPayload = {
    users: users.map(({ joinedAt, ...rest }) => rest),
  };
  broadcastToRoom(roomId, {
    type: 'user-list',
    roomId,
    userId: 'server',
    payload,
  });
}

function sendVersionListUpdate(roomId: string) {
  const versions = getVersions(roomId);
  const payload: VersionListPayload = { versions };
  broadcastToRoom(roomId, {
    type: 'version-list',
    roomId,
    userId: 'server',
    payload,
  });
}

wss.on('connection', (ws: WebSocketExt) => {
  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      const { type, roomId, userId, payload } = message;

      switch (type) {
        case 'join': {
          const joinPayload = payload as JoinPayload;
          const nickname = joinPayload.nickname.trim();
          
          if (!nickname || !roomId || !userId) {
            sendMessage(ws, 'error', '', '', { message: '参数不完整' });
            return;
          }
          
          let room = getRoom(roomId);
          if (!room) {
            createRoom();
            room = getRoom(roomId);
            if (!room) {
              sendMessage(ws, 'error', roomId, userId, { message: '房间不存在' });
              return;
            }
          }
          
          ws.roomId = roomId;
          ws.userId = userId;
          ws.nickname = nickname;
          
          const user = addUser(roomId, userId, nickname);
          
          if (user) {
            const initPayload: InitPayload = {
              content: room.content,
              version: room.version,
              users: getUsers(roomId).map(({ joinedAt, ...rest }) => rest),
              versions: getVersions(roomId),
            };
            sendMessage(ws, 'init', roomId, userId, initPayload);
            
            broadcastToRoom(roomId, {
              type: 'join',
              roomId,
              userId,
              payload: { user: { id: user.id, nickname: user.nickname, color: user.color, cursorPosition: 0, selectionStart: 0, selectionEnd: 0 } },
            }, userId);
            
            sendUserListUpdate(roomId);
          }
          break;
        }

        case 'content-update': {
          if (!ws.roomId || !ws.userId) return;
          
          const { content, version } = payload as ContentUpdatePayload;
          const room = getRoom(ws.roomId);
          
          if (room) {
            const newVersion = room.version + 1;
            updateDocument(ws.roomId, content, newVersion);
            
            broadcastToRoom(ws.roomId, {
              type: 'content-update',
              roomId: ws.roomId,
              userId: ws.userId,
              payload: { content, version: newVersion },
            }, ws.userId);
          }
          break;
        }

        case 'cursor-update': {
          if (!ws.roomId || !ws.userId) return;
          
          const { position, selectionStart, selectionEnd } = payload as CursorUpdatePayload;
          updateCursor(ws.roomId, ws.userId, position, selectionStart, selectionEnd);
          
          const room = getRoom(ws.roomId);
          const user = room?.users.get(ws.userId);
          
          if (user) {
            broadcastToRoom(ws.roomId, {
              type: 'cursor-update',
              roomId: ws.roomId,
              userId: ws.userId,
              payload: {
                position,
                selectionStart,
                selectionEnd,
                color: user.color,
                nickname: user.nickname,
              },
            }, ws.userId);
          }
          break;
        }

        case 'chat': {
          if (!ws.roomId || !ws.userId || !ws.nickname) return;
          
          const chatPayload = payload as ChatPayload;
          const room = getRoom(ws.roomId);
          const user = room?.users.get(ws.userId);
          
          const fullPayload: ChatPayload = {
            messageId: uuidv4(),
            content: chatPayload.content,
            timestamp: Date.now(),
            nickname: ws.nickname,
            avatarColor: user?.color || '#4ECDC4',
          };
          
          broadcastToRoom(ws.roomId, {
            type: 'chat',
            roomId: ws.roomId,
            userId: ws.userId,
            payload: fullPayload,
          });
          break;
        }

        case 'save-version': {
          if (!ws.roomId || !ws.userId || !ws.nickname) return;
          
          const { note } = payload as SaveVersionPayload;
          const version = saveVersion(ws.roomId, ws.userId, ws.nickname, note);
          
          if (version) {
            sendVersionListUpdate(ws.roomId);
          }
          break;
        }

        case 'revert-version': {
          if (!ws.roomId || !ws.userId) return;
          
          const { versionId } = payload as RevertVersionPayload;
          const version = revertVersion(ws.roomId, versionId);
          const room = getRoom(ws.roomId);
          
          if (version && room) {
            broadcastToRoom(ws.roomId, {
              type: 'content-update',
              roomId: ws.roomId,
              userId: 'server',
              payload: {
                content: version.content,
                version: room.version,
              },
            });
            
            sendVersionListUpdate(ws.roomId);
          }
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && ws.userId) {
      removeUser(ws.roomId, ws.userId);
      
      broadcastToRoom(ws.roomId, {
        type: 'leave',
        roomId: ws.roomId,
        userId: ws.userId,
        payload: { userId: ws.userId },
      });
      
      sendUserListUpdate(ws.roomId);
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});
