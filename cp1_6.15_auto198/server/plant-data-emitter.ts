import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

interface PlantData {
  timestamp: number;
  rootPotential: number;
  stomatalOpening: number;
  calciumOscillation: number;
  waterFlow: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;
const DATA_INTERVAL = 500;
const STOMATAL_PERIOD = 6000;

let startTime = Date.now();

function generatePlantData(): PlantData {
  const elapsed = Date.now() - startTime;

  const basePotential = -100;
  const potentialNoise = (Math.random() - 0.5) * 6;
  const rootPotential = basePotential + potentialNoise;

  const stomatalPhase = (elapsed % STOMATAL_PERIOD) / STOMATAL_PERIOD;
  const stomatalOpening = (Math.sin(stomatalPhase * Math.PI * 2) + 1) / 2 * 100;

  const calciumBase = 1.25;
  const calciumVariation = Math.sin(elapsed / 3000) * 0.5 + (Math.random() - 0.5) * 0.2;
  const calciumOscillation = Math.max(0.5, Math.min(2, calciumBase + calciumVariation));

  const waterBase = 2.5;
  const waterVariation = Math.sin(elapsed / 5000) * 1.5 + (Math.random() - 0.5) * 0.5;
  const waterFlow = Math.max(0, Math.min(5, waterBase + waterVariation));

  return {
    timestamp: Date.now(),
    rootPotential: Math.round(rootPotential * 100) / 100,
    stomatalOpening: Math.round(stomatalOpening * 100) / 100,
    calciumOscillation: Math.round(calciumOscillation * 100) / 100,
    waterFlow: Math.round(waterFlow * 100) / 100,
  };
}

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');

  ws.on('message', (message: string) => {
    console.log('Received message:', message);
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

setInterval(() => {
  const data = generatePlantData();
  const dataStr = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(dataStr);
    }
  });
}, DATA_INTERVAL);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

server.listen(PORT, () => {
  console.log(`Plant data emitter server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
