import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface DrawCommand {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'sticky' | 'image';
  userId: string;
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  imageData?: string;
  rotation?: number;
  collapsed?: boolean;
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
  roomId: string;
}

interface Room {
  id: string;
  users: Map<string, User>;
  commands: DrawCommand[];
  commandQueue: DrawCommand[];
  lastBroadcastTime: number;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Room>();

const userColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'
];

function getRandomColor(): string {
  return userColors[Math.floor(Math.random() * userColors.length)];
}

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      users: new Map(),
      commands: [],
      commandQueue: [],
      lastBroadcastTime: 0
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: Room, message: string, excludeUserId?: string) {
  room.users.forEach((user) => {
    if (user.id !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  });
}

function broadcastUsersList(room: Room) {
  const users = Array.from(room.users.values()).map(u => ({
    id: u.id,
    name: u.name,
    color: u.color
  }));
  const message = JSON.stringify({ type: 'users', users });
  broadcastToRoom(room, message);
}

function flushCommandQueue(room: Room) {
  if (room.commandQueue.length === 0) return;
  
  const commands = [...room.commandQueue];
  room.commandQueue = [];
  
  const message = JSON.stringify({ type: 'drawBatch', commands });
  broadcastToRoom(room, message);
}

function scheduleBroadcast(room: Room) {
  const now = Date.now();
  const timeSinceLast = now - room.lastBroadcastTime;
  
  if (timeSinceLast >= 100) {
    room.lastBroadcastTime = now;
    flushCommandQueue(room);
  } else {
    setTimeout(() => {
      room.lastBroadcastTime = Date.now();
      flushCommandQueue(room);
    }, 100 - timeSinceLast);
  }
}

wss.on('connection', (ws) => {
  let currentUser: User | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join': {
          const { roomId, userId, userName } = message;
          const room = getOrCreateRoom(roomId);
          
          const user: User = {
            id: userId || uuidv4(),
            name: userName || '匿名用户',
            color: getRandomColor(),
            ws,
            roomId
          };
          
          room.users.set(user.id, user);
          currentUser = user;
          
          ws.send(JSON.stringify({
            type: 'init',
            userId: user.id,
            userName: user.name,
            userColor: user.color,
            commands: room.commands,
            users: Array.from(room.users.values()).map(u => ({
              id: u.id,
              name: u.name,
              color: u.color
            }))
          }));
          
          broadcastUsersList(room);
          break;
        }
        
        case 'draw': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          const command: DrawCommand = {
            ...message.command,
            id: message.command.id || uuidv4(),
            userId: currentUser.id,
            timestamp: Date.now()
          };
          
          room.commands.push(command);
          room.commandQueue.push(command);
          
          scheduleBroadcast(room);
          break;
        }
        
        case 'drawBatch': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          const commands = message.commands.map((cmd: DrawCommand) => ({
            ...cmd,
            id: cmd.id || uuidv4(),
            userId: currentUser!.id,
            timestamp: Date.now()
          }));
          
          room.commands.push(...commands);
          room.commandQueue.push(...commands);
          
          scheduleBroadcast(room);
          break;
        }
        
        case 'undo': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          const { commandId } = message;
          const cmdIndex = room.commands.findIndex(c => c.id === commandId);
          if (cmdIndex > -1) {
            room.commands.splice(cmdIndex, 1);
            broadcastToRoom(room, JSON.stringify({ type: 'undo', commandId, userId: currentUser.id }));
          }
          break;
        }
        
        case 'redo': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          const { command } = message;
          room.commands.push(command);
          broadcastToRoom(room, JSON.stringify({ type: 'redo', command, userId: currentUser.id }));
          break;
        }
        
        case 'cursor': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          broadcastToRoom(
            room,
            JSON.stringify({
              type: 'cursor',
              userId: currentUser.id,
              position: message.position
            }),
            currentUser.id
          );
          break;
        }
        
        case 'chat': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          broadcastToRoom(
            room,
            JSON.stringify({
              type: 'chat',
              userId: currentUser.id,
              userName: currentUser.name,
              message: message.message,
              timestamp: Date.now()
            })
          );
          break;
        }
        
        case 'update': {
          if (!currentUser) break;
          const room = rooms.get(currentUser.roomId);
          if (!room) break;
          
          const { command } = message;
          const cmdIndex = room.commands.findIndex(c => c.id === command.id);
          if (cmdIndex > -1) {
            room.commands[cmdIndex] = command;
            broadcastToRoom(
              room,
              JSON.stringify({ type: 'update', command })
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      const room = rooms.get(currentUser.roomId);
      if (room) {
        room.users.delete(currentUser.id);
        broadcastUsersList(room);
        
        if (room.users.size === 0) {
          setTimeout(() => {
            const r = rooms.get(currentUser!.roomId);
            if (r && r.users.size === 0) {
              rooms.delete(currentUser!.roomId);
            }
          }, 5 * 60 * 1000);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
