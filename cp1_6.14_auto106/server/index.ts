import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_PATH = path.join(__dirname, 'data.json');

interface Room {
  id: string;
  name: string;
  maxCapacity: number;
  defaultDuration: number;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface Event {
  id: string;
  roomId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  memberIds: string[];
}

interface Note {
  id: string;
  content: string;
  emotion: string;
  audio: string | null;
  createdAt: string;
}

interface SheetBlock {
  id: string;
  instrument: string;
  startBar: number;
  endBar: number;
  chords: string;
  notes: string;
}

interface Sheet {
  id: string;
  title: string;
  tonality: string;
  timeSignature: string;
  bpm: number;
  blocks: SheetBlock[];
}

interface Data {
  rooms: Room[];
  members: Member[];
  events: Event[];
  notes: Note[];
  sheets: Sheet[];
}

const readData = (): Data => {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { rooms: [], members: [], events: [], notes: [], sheets: [] };
  }
};

const writeData = (data: Data) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

const checkConflict = (events: Event[], newEvent: Omit<Event, 'id'>): boolean => {
  return events.some(event => {
    if (event.id === (newEvent as Event).id) return false;
    if (event.roomId !== newEvent.roomId) return false;
    if (event.date !== newEvent.date) return false;
    
    const start1 = timeToMinutes(event.startTime);
    const end1 = timeToMinutes(event.endTime);
    const start2 = timeToMinutes(newEvent.startTime);
    const end2 = timeToMinutes(newEvent.endTime);
    
    return start2 < end1 && end2 > start1;
  });
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const wss = new WebSocketServer({ port: 3002 });
const clients = new Map<string, WebSocket>();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  
  console.log(`Client connected: ${clientId}, total: ${clients.size}`);
  
  const memberAvatars = ['🎸', '🎻', '🥁', '🎤', '🎹', '🎺', '🎷', '🪘'];
  const randomAvatar = memberAvatars[Math.floor(Math.random() * memberAvatars.length)];
  
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    clientId,
    avatar: randomAvatar,
    onlineCount: clients.size
  }));

  broadcast(JSON.stringify({
    type: 'MEMBER_LIST',
    members: Array.from(clients.keys()).map(id => ({
      id,
      avatar: id === clientId ? randomAvatar : memberAvatars[Math.floor(Math.random() * memberAvatars.length)]
    }))
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'SHEET_UPDATE') {
        console.log(`Broadcasting sheet update from ${clientId}`);
        broadcast(JSON.stringify({
          type: 'SHEET_UPDATED',
          ...data,
          clientId,
          avatar: randomAvatar
        }), clientId);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}, total: ${clients.size}`);
    
    broadcast(JSON.stringify({
      type: 'MEMBER_LIST',
      members: Array.from(clients.keys()).map(id => ({
        id,
        avatar: memberAvatars[Math.floor(Math.random() * memberAvatars.length)]
      }))
    }));
  });
});

const broadcast = (message: string, excludeId?: string) => {
  clients.forEach((client, id) => {
    if (id !== excludeId && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

app.get('/api/rooms', (req: Request, res: Response) => {
  const data = readData();
  res.json(data.rooms);
});

app.post('/api/rooms', (req: Request, res: Response) => {
  const data = readData();
  const room: Room = { id: uuidv4(), ...req.body };
  data.rooms.push(room);
  writeData(data);
  res.status(201).json(room);
});

app.get('/api/members', (req: Request, res: Response) => {
  const data = readData();
  res.json(data.members);
});

app.get('/api/events', (req: Request, res: Response) => {
  const data = readData();
  res.json(data.events);
});

app.post('/api/events', (req: Request, res: Response) => {
  const data = readData();
  const newEvent = req.body;
  
  if (checkConflict(data.events, newEvent)) {
    return res.status(409).json({ error: '时间冲突！该时段已有排练安排' });
  }
  
  const event: Event = { id: uuidv4(), ...newEvent };
  data.events.push(event);
  writeData(data);
  res.status(201).json(event);
});

app.put('/api/events/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const eventIndex = data.events.findIndex(e => e.id === id);
  
  if (eventIndex === -1) {
    return res.status(404).json({ error: '事件不存在' });
  }
  
  const updatedEvent = { ...data.events[eventIndex], ...req.body };
  
  if (checkConflict(data.events, updatedEvent)) {
    return res.status(409).json({ error: '时间冲突！该时段已有排练安排' });
  }
  
  data.events[eventIndex] = updatedEvent;
  writeData(data);
  res.json(updatedEvent);
});

app.delete('/api/events/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  data.events = data.events.filter(e => e.id !== id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/notes', (req: Request, res: Response) => {
  const data = readData();
  res.json(data.notes.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
});

app.post('/api/notes', (req: Request, res: Response) => {
  const data = readData();
  const note: Note = { 
    id: uuidv4(), 
    ...req.body, 
    createdAt: new Date().toISOString() 
  };
  data.notes.push(note);
  writeData(data);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const noteIndex = data.notes.findIndex(n => n.id === id);
  
  if (noteIndex === -1) {
    return res.status(404).json({ error: '便签不存在' });
  }
  
  data.notes[noteIndex] = { ...data.notes[noteIndex], ...req.body };
  writeData(data);
  res.json(data.notes[noteIndex]);
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  data.notes = data.notes.filter(n => n.id !== id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/sheets', (req: Request, res: Response) => {
  const data = readData();
  res.json(data.sheets);
});

app.get('/api/sheets/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const sheet = data.sheets.find(s => s.id === id);
  
  if (!sheet) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  res.json(sheet);
});

app.post('/api/sheets', (req: Request, res: Response) => {
  const data = readData();
  const sheet: Sheet = { id: uuidv4(), blocks: [], ...req.body };
  data.sheets.push(sheet);
  writeData(data);
  res.status(201).json(sheet);
});

app.put('/api/sheets/:id', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const sheetIndex = data.sheets.findIndex(s => s.id === id);
  
  if (sheetIndex === -1) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  data.sheets[sheetIndex] = { ...data.sheets[sheetIndex], ...req.body };
  writeData(data);
  res.json(data.sheets[sheetIndex]);
});

app.post('/api/sheets/:id/blocks', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const sheetIndex = data.sheets.findIndex(s => s.id === id);
  
  if (sheetIndex === -1) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  const block: SheetBlock = { id: uuidv4(), ...req.body };
  data.sheets[sheetIndex].blocks.push(block);
  writeData(data);
  res.status(201).json(block);
});

app.put('/api/sheets/:id/blocks/:blockId', (req: Request, res: Response) => {
  const data = readData();
  const { id, blockId } = req.params;
  const sheetIndex = data.sheets.findIndex(s => s.id === id);
  
  if (sheetIndex === -1) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  const blockIndex = data.sheets[sheetIndex].blocks.findIndex(b => b.id === blockId);
  
  if (blockIndex === -1) {
    return res.status(404).json({ error: '块不存在' });
  }
  
  data.sheets[sheetIndex].blocks[blockIndex] = {
    ...data.sheets[sheetIndex].blocks[blockIndex],
    ...req.body
  };
  
  writeData(data);
  res.json(data.sheets[sheetIndex].blocks[blockIndex]);
});

app.delete('/api/sheets/:id/blocks/:blockId', (req: Request, res: Response) => {
  const data = readData();
  const { id, blockId } = req.params;
  const sheetIndex = data.sheets.findIndex(s => s.id === id);
  
  if (sheetIndex === -1) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  data.sheets[sheetIndex].blocks = data.sheets[sheetIndex].blocks.filter(
    b => b.id !== blockId
  );
  
  writeData(data);
  res.json({ success: true });
});

app.put('/api/sheets/:id/reorder', (req: Request, res: Response) => {
  const data = readData();
  const { id } = req.params;
  const { blocks } = req.body;
  const sheetIndex = data.sheets.findIndex(s => s.id === id);
  
  if (sheetIndex === -1) {
    return res.status(404).json({ error: '曲谱不存在' });
  }
  
  data.sheets[sheetIndex].blocks = blocks;
  writeData(data);
  res.json(data.sheets[sheetIndex]);
});

app.listen(PORT, () => {
  console.log(`REST API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:3002`);
});
