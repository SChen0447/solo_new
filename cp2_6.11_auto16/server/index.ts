import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

type VoteStatus = 'available' | 'hesitant' | 'unavailable';

interface CandidateTime {
  id: string;
  startTime: string;
  endTime: string;
}

interface Vote {
  id: string;
  eventId: string;
  candidateTimeId: string;
  participantName: string;
  status: VoteStatus;
  timestamp: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  tags: string[];
  candidateTimes: CandidateTime[];
  createdAt: string;
}

interface TimeSlotStats {
  candidateTimeId: string;
  startTime: string;
  available: number;
  hesitant: number;
  unavailable: number;
}

interface StatsResponse {
  event: Event;
  timeSlotStats: TimeSlotStats[];
  totalParticipants: number;
  statusDistribution: {
    available: number;
    hesitant: number;
    unavailable: number;
  };
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const events = new Map<string, Event>();
const votes = new Map<string, Vote[]>();
const clients = new Map<string, Set<WebSocket>>();

const broadcast = (eventId: string, data: any) => {
  const eventClients = clients.get(eventId);
  if (!eventClients) return;
  const message = JSON.stringify(data);
  eventClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const calculateStats = (eventId: string): StatsResponse | null => {
  const event = events.get(eventId);
  if (!event) return null;

  const eventVotes = votes.get(eventId) || [];
  
  const timeSlotStats: TimeSlotStats[] = event.candidateTimes.map((ct) => {
    const ctVotes = eventVotes.filter((v) => v.candidateTimeId === ct.id);
    return {
      candidateTimeId: ct.id,
      startTime: ct.startTime,
      available: ctVotes.filter((v) => v.status === 'available').length,
      hesitant: ctVotes.filter((v) => v.status === 'hesitant').length,
      unavailable: ctVotes.filter((v) => v.status === 'unavailable').length,
    };
  });

  const uniqueParticipants = new Set(eventVotes.map((v) => v.participantName));
  
  const statusDistribution = {
    available: eventVotes.filter((v) => v.status === 'available').length,
    hesitant: eventVotes.filter((v) => v.status === 'hesitant').length,
    unavailable: eventVotes.filter((v) => v.status === 'unavailable').length,
  };

  return {
    event,
    timeSlotStats,
    totalParticipants: uniqueParticipants.size,
    statusDistribution,
  };
};

wss.on('connection', (ws, req) => {
  const url = req.url || '';
  const match = url.match(/\/ws\/events\/(.+)/);
  const eventId = match ? match[1] : null;

  if (!eventId) {
    ws.close();
    return;
  }

  if (!clients.has(eventId)) {
    clients.set(eventId, new Set());
  }
  clients.get(eventId)!.add(ws);

  ws.on('close', () => {
    const eventClients = clients.get(eventId);
    if (eventClients) {
      eventClients.delete(ws);
      if (eventClients.size === 0) {
        clients.delete(eventId);
      }
    }
  });

  const currentStats = calculateStats(eventId);
  if (currentStats) {
    ws.send(JSON.stringify({ type: 'initial', data: currentStats }));
  }
});

app.post('/api/events', (req: Request, res: Response) => {
  const { title, description, tags, candidateTimes } = req.body;

  if (!title || !candidateTimes || candidateTimes.length === 0) {
    return res.status(400).json({ error: 'Title and candidate times are required' });
  }

  const event: Event = {
    id: uuidv4(),
    title,
    description: description || '',
    tags: tags || [],
    candidateTimes: candidateTimes.map((ct: { startTime: string; endTime: string }) => ({
      id: uuidv4(),
      startTime: ct.startTime,
      endTime: ct.endTime,
    })),
    createdAt: new Date().toISOString(),
  };

  events.set(event.id, event);
  votes.set(event.id, []);

  res.status(201).json({
    id: event.id,
    shareUrl: `/vote/${event.id}`,
    statsUrl: `/stats/${event.id}`,
    event,
  });
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const eventVotes = votes.get(req.params.id) || [];
  res.json({ event, votes: eventVotes });
});

app.post('/api/vote', (req: Request, res: Response) => {
  const { eventId, candidateTimeId, participantName, status } = req.body;

  if (!eventId || !candidateTimeId || !participantName || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!events.has(eventId)) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const eventVotes = votes.get(eventId) || [];
  
  const existingVoteIndex = eventVotes.findIndex(
    (v) => v.candidateTimeId === candidateTimeId && v.participantName === participantName
  );

  const vote: Vote = {
    id: uuidv4(),
    eventId,
    candidateTimeId,
    participantName,
    status,
    timestamp: new Date().toISOString(),
  };

  if (existingVoteIndex >= 0) {
    eventVotes[existingVoteIndex] = vote;
  } else {
    eventVotes.push(vote);
  }

  votes.set(eventId, eventVotes);

  const stats = calculateStats(eventId);
  if (stats) {
    broadcast(eventId, { type: 'vote_update', data: stats });
  }

  res.status(200).json({ success: true, vote });
});

app.get('/api/events/:id/stats', (req: Request, res: Response) => {
  const stats = calculateStats(req.params.id);
  if (!stats) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(stats);
});

app.get('/api/events/:id/votes', (req: Request, res: Response) => {
  const eventVotes = votes.get(req.params.id);
  if (!eventVotes) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const { tag } = req.query;
  const event = events.get(req.params.id);
  
  let filteredVotes = eventVotes;
  if (tag && event && event.tags.includes(tag as string)) {
    filteredVotes = eventVotes;
  }
  
  res.json(filteredVotes);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
