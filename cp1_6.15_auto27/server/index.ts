import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface User {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
  color: string;
  thickness: number;
}

interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  color: string;
  thickness: number;
  fill?: string;
}

interface CircleElement extends BaseElement {
  type: 'circle';
  width: number;
  height: number;
  color: string;
  thickness: number;
  fill?: string;
}

interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}

interface NoteElement extends BaseElement {
  type: 'note';
  width: number;
  height: number;
  text: string;
  bgColor: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  width: number;
  height: number;
  src: string;
}

type WhiteboardElement =
  | PenElement
  | RectElement
  | CircleElement
  | LineElement
  | NoteElement
  | ImageElement;

interface Snapshot {
  id: string;
  timestamp: number;
  elements: WhiteboardElement[];
}

interface Session {
  id: string;
  name: string;
  hostId: string;
  elements: WhiteboardElement[];
  users: Record<string, User>;
  snapshots: Snapshot[];
  createdAt: number;
  updatedAt: number;
}

interface SessionStore {
  sessions: Record<string, Session>;
}

const USER_COLORS = [
  '#ff6b6b',
  '#00d2ff',
  '#7bed9f',
  '#ffa502',
  '#ff6b9d',
  '#3742fa',
  '#2ed573',
  '#eccc68'
];

const loadSessions = (): SessionStore => {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
  return { sessions: {} };
};

const saveSessions = (store: SessionStore) => {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
};

let sessionStore = loadSessions();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/sessions/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json({
    id: session.id,
    name: session.name,
    elements: session.elements,
    users: Object.values(session.users),
    snapshotCount: session.snapshots.length
  });
});

app.post('/api/sessions', (req: Request, res: Response) => {
  const sessionId = uuidv4().slice(0, 8);
  const hostId = uuidv4();
  const session: Session = {
    id: sessionId,
    name: req.body.name || `白板 ${sessionId}`,
    hostId,
    elements: [],
    users: {},
    snapshots: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  sessionStore.sessions[sessionId] = session;
  saveSessions(sessionStore);
  res.json({ sessionId, hostId });
});

app.get('/api/sessions/:sessionId/snapshots', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session.snapshots.map(s => ({
    id: s.id,
    timestamp: s.timestamp
  })));
});

app.get('/api/sessions/:sessionId/snapshots/:snapshotId', (req: Request, res: Response) => {
  const { sessionId, snapshotId } = req.params;
  const session = sessionStore.sessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  const snapshot = session.snapshots.find(s => s.id === snapshotId);
  if (!snapshot) {
    return res.status(404).json({ error: '快照不存在' });
  }
  res.json(snapshot);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const socketToSession = new Map<string, { sessionId: string; userId: string }>();

const createSnapshot = (sessionId: string) => {
  const session = sessionStore.sessions[sessionId];
  if (!session) return;
  const snapshot: Snapshot = {
    id: uuidv4(),
    timestamp: Date.now(),
    elements: JSON.parse(JSON.stringify(session.elements))
  };
  session.snapshots.push(snapshot);
  if (session.snapshots.length > 20) {
    session.snapshots.shift();
  }
  saveSessions(sessionStore);
};

setInterval(() => {
  Object.keys(sessionStore.sessions).forEach(sessionId => {
    const session = sessionStore.sessions[sessionId];
    if (Object.keys(session.users).length > 0) {
      createSnapshot(sessionId);
    }
  });
}, 5 * 60 * 1000);

io.on('connection', (socket: Socket) => {
  socket.on('join', (data: { sessionId: string; userName: string; hostId?: string }) => {
    const { sessionId, userName, hostId } = data;
    let session = sessionStore.sessions[sessionId];

    if (!session) {
      if (hostId) {
        session = {
          id: sessionId,
          name: `白板 ${sessionId}`,
          hostId,
          elements: [],
          users: {},
          snapshots: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        sessionStore.sessions[sessionId] = session;
      } else {
        socket.emit('error', { message: '会话不存在' });
        return;
      }
    }

    const existingUser = Object.values(session.users).find(u => u.name === userName);
    let userId: string;
    let userColor: string;
    let isHost = false;

    if (existingUser) {
      userId = existingUser.id;
      userColor = existingUser.color;
      isHost = existingUser.isHost;
    } else {
      userId = uuidv4();
      const usedColors = Object.values(session.users).map(u => u.color);
      const availableColors = USER_COLORS.filter(c => !usedColors.includes(c));
      userColor = availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
      isHost = (hostId && session.hostId === hostId) || Object.keys(session.users).length === 0;
      if (isHost && !hostId) {
        session.hostId = userId;
      }
    }

    const user: User = {
      id: userId,
      name: userName,
      color: userColor,
      isHost
    };
    session.users[userId] = user;
    session.updatedAt = Date.now();
    saveSessions(sessionStore);

    socket.join(sessionId);
    socketToSession.set(socket.id, { sessionId, userId });

    socket.emit('joined', {
      userId,
      userColor,
      isHost,
      sessionId,
      elements: session.elements,
      users: Object.values(session.users)
    });

    socket.to(sessionId).emit('userJoined', user);
  });

  socket.on('action', (action: { type: string; payload: any; sessionId: string }) => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const { sessionId, userId } = mapping;
    const session = sessionStore.sessions[sessionId];
    if (!session) return;

    const { type, payload } = action;
    const timestamp = Date.now();

    switch (type) {
      case 'element:add': {
        const element = { ...payload, userId, createdAt: timestamp, updatedAt: timestamp };
        session.elements.push(element);
        session.updatedAt = timestamp;
        socket.to(sessionId).emit('action', { type, payload: element });
        break;
      }
      case 'element:update': {
        const idx = session.elements.findIndex(e => e.id === payload.id);
        if (idx !== -1) {
          session.elements[idx] = { ...session.elements[idx], ...payload, updatedAt: timestamp };
          session.updatedAt = timestamp;
          socket.to(sessionId).emit('action', { type, payload });
        }
        break;
      }
      case 'element:delete': {
        session.elements = session.elements.filter(e => e.id !== payload.id);
        session.updatedAt = timestamp;
        socket.to(sessionId).emit('action', { type, payload });
        break;
      }
      case 'canvas:clear': {
        const mapping2 = socketToSession.get(socket.id);
        if (mapping2) {
          const user = session.users[mapping2.userId];
          if (user?.isHost) {
            session.elements = [];
            session.updatedAt = timestamp;
            io.to(sessionId).emit('action', { type, payload: {} });
          }
        }
        break;
      }
      case 'snapshot:restore': {
        const mapping2 = socketToSession.get(socket.id);
        if (mapping2) {
          const user = session.users[mapping2.userId];
          if (user?.isHost) {
            const snapshot = session.snapshots.find(s => s.id === payload.snapshotId);
            if (snapshot) {
              createSnapshot(sessionId);
              session.elements = JSON.parse(JSON.stringify(snapshot.elements));
              session.updatedAt = timestamp;
              io.to(sessionId).emit('action', {
                type: 'snapshot:restored',
                payload: { elements: session.elements }
              });
            }
          }
        }
        break;
      }
      case 'user:kick': {
        const mapping2 = socketToSession.get(socket.id);
        if (mapping2) {
          const user = session.users[mapping2.userId];
          if (user?.isHost && payload.userId !== mapping2.userId) {
            delete session.users[payload.userId];
            session.updatedAt = timestamp;
            io.to(sessionId).emit('userKicked', { userId: payload.userId });
            const targetSockets = io.sockets.sockets;
            for (const [sId, s] of targetSockets) {
              const sMap = socketToSession.get(sId);
              if (sMap && sMap.userId === payload.userId) {
                s.emit('kicked');
                s.leave(sessionId);
              }
            }
          }
        }
        break;
      }
    }

    saveSessions(sessionStore);
  });

  socket.on('disconnect', () => {
    const mapping = socketToSession.get(socket.id);
    if (mapping) {
      const { sessionId, userId } = mapping;
      const session = sessionStore.sessions[sessionId];
      if (session && session.users[userId]) {
        delete session.users[userId];
        session.updatedAt = Date.now();
        saveSessions(sessionStore);
        socket.to(sessionId).emit('userLeft', { userId });
      }
      socketToSession.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
