import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

interface Client {
  ws: WebSocket;
  id: string;
  color: string;
  name: string;
}

const COLORS = ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#06d6a0'];
const clients = new Map<string, Client>();
let clientCounter = 0;

function generateName(): string {
  const adjectives = ['快乐', '聪明', '勇敢', '温柔', '活泼', '冷静', '热情', '专注'];
  const nouns = ['小熊', '兔子', '狐狸', '猫咪', '小狗', '老虎', '狮子', '熊猫'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
}

function broadcast(message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  const id = `client_${++clientCounter}_${Date.now()}`;
  const color = COLORS[clientCounter % COLORS.length];
  const name = generateName();

  const client: Client = { ws, id, color, name };
  clients.set(id, client);

  ws.send(JSON.stringify({
    type: 'init',
    userId: id,
    userColor: color,
    userName: name,
    users: Array.from(clients.values()).map(c => ({
      id: c.id,
      color: c.color,
      name: c.name,
    })),
  }));

  broadcast({
    type: 'userJoin',
    user: { id, color, name },
  }, id);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'draw':
          broadcast({
            type: 'draw',
            userId: id,
            element: message.element,
          }, id);
          break;
        
        case 'updateElement':
          broadcast({
            type: 'updateElement',
            userId: id,
            element: message.element,
          }, id);
          break;
        
        case 'cursor':
          broadcast({
            type: 'cursor',
            userId: id,
            x: message.x,
            y: message.y,
            timestamp: Date.now(),
          }, id);
          break;
        
        case 'clear':
          broadcast({
            type: 'clear',
            userId: id,
          }, id);
          break;
      }
    } catch (err) {
      console.error('Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast({
      type: 'userLeave',
      userId: id,
    });
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(id);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
