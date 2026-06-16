import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface AuctionItem {
  id: string;
  name: string;
  startPrice: number;
  currentPrice: number;
  duration: number;
  startTime: number;
  endTime: number;
  status: 'active' | 'completed';
  winner: string | null;
  initialBidder: string;
}

interface Bid {
  itemId: string;
  amount: number;
  bidder: string;
  timestamp: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const items = new Map<string, AuctionItem>();
const bidHistory = new Map<string, Bid[]>();
const timers = new Map<string, NodeJS.Timeout>();

const MAX_ITEMS = 50;

function endAuction(itemId: string) {
  const item = items.get(itemId);
  if (!item || item.status === 'completed') return;

  const bids = bidHistory.get(itemId) || [];
  const winner = bids.length > 0 ? bids[bids.length - 1].bidder : item.initialBidder;

  item.status = 'completed';
  item.winner = winner;

  if (timers.has(itemId)) {
    clearInterval(timers.get(itemId)!);
    timers.delete(itemId);
  }

  io.emit('auctionEnded', {
    itemId,
    winner,
    finalPrice: item.currentPrice,
  });
}

function checkAndEndExpired() {
  const now = Date.now();
  for (const [id, item] of items) {
    if (item.status === 'active' && now >= item.endTime) {
      endAuction(id);
    }
  }
}

setInterval(checkAndEndExpired, 1000);

app.get('/api/items', (req, res) => {
  const allItems = Array.from(items.values()).slice(0, MAX_ITEMS);
  res.json(allItems);
});

app.get('/api/items/:id', (req, res) => {
  const item = items.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

app.get('/api/items/:id/bids', (req, res) => {
  const bids = bidHistory.get(req.params.id) || [];
  res.json(bids);
});

app.post('/api/items', (req, res) => {
  const { name, startPrice, duration } = req.body;

  if (!name || typeof name !== 'string' || name.length > 20) {
    res.status(400).json({ error: 'Invalid name (max 20 characters)' });
    return;
  }

  if (
    typeof startPrice !== 'number' ||
    !Number.isInteger(startPrice) ||
    startPrice < 1 ||
    startPrice > 9999
  ) {
    res.status(400).json({ error: 'Invalid start price (1-9999 integer)' });
    return;
  }

  if (![30, 60, 120].includes(duration)) {
    res.status(400).json({ error: 'Invalid duration (30, 60, or 120 seconds)' });
    return;
  }

  if (items.size >= MAX_ITEMS) {
    res.status(400).json({ error: 'Maximum items reached' });
    return;
  }

  const id = uuidv4();
  const startTime = Date.now();
  const endTime = startTime + duration * 1000;

  const item: AuctionItem = {
    id,
    name,
    startPrice,
    currentPrice: startPrice,
    duration,
    startTime,
    endTime,
    status: 'active',
    winner: null,
    initialBidder: 'Seller',
  };

  items.set(id, item);
  bidHistory.set(id, []);

  io.emit('itemCreated', item);

  res.status(201).json(item);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('placeBid', (data: { itemId: string; amount: number; bidder: string }) => {
    const { itemId, amount, bidder } = data;
    const item = items.get(itemId);

    if (!item) {
      socket.emit('bidError', { itemId, error: 'Item not found' });
      return;
    }

    if (item.status === 'completed') {
      socket.emit('bidError', { itemId, error: 'Auction has ended' });
      return;
    }

    if (!Number.isInteger(amount) || amount <= item.currentPrice) {
      socket.emit('bidError', { itemId, error: 'Bid must be higher than current price' });
      return;
    }

    const timestamp = Date.now();
    const bid: Bid = { itemId, amount, bidder, timestamp };

    const history = bidHistory.get(itemId) || [];
    history.push(bid);
    bidHistory.set(itemId, history);

    item.currentPrice = amount;

    io.emit('bidPlaced', {
      itemId,
      amount,
      bidder,
      timestamp,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
