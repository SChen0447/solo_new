import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let trafficStats = {
  vehicleCount: 0,
  avgSpeed: 0,
  pedestrianCount: 0,
  trafficLightCycle: 30,
  timestamp: Date.now()
};

let simulationParams = {
  vehicleDensity: 5,
  pedestrianDensity: 'medium',
  lightCycleSpeed: 30
};

app.get('/api/status', (req, res) => {
  trafficStats.timestamp = Date.now();
  res.json(trafficStats);
});

app.get('/api/params', (req, res) => {
  res.json(simulationParams);
});

app.post('/api/params', (req, res) => {
  const { vehicleDensity, pedestrianDensity, lightCycleSpeed } = req.body;
  
  if (vehicleDensity !== undefined) {
    simulationParams.vehicleDensity = Math.max(1, Math.min(10, Number(vehicleDensity)));
  }
  if (pedestrianDensity !== undefined && ['low', 'medium', 'high'].includes(pedestrianDensity)) {
    simulationParams.pedestrianDensity = pedestrianDensity;
  }
  if (lightCycleSpeed !== undefined) {
    simulationParams.lightCycleSpeed = Math.max(15, Math.min(45, Number(lightCycleSpeed)));
  }
  
  res.json({
    success: true,
    params: simulationParams,
    message: 'Parameters updated. Simulation will reset in 5 seconds.'
  });
});

app.post('/api/stats', (req, res) => {
  const { vehicleCount, avgSpeed, pedestrianCount, trafficLightCycle } = req.body;
  
  if (vehicleCount !== undefined) trafficStats.vehicleCount = vehicleCount;
  if (avgSpeed !== undefined) trafficStats.avgSpeed = avgSpeed;
  if (pedestrianCount !== undefined) trafficStats.pedestrianCount = pedestrianCount;
  if (trafficLightCycle !== undefined) trafficStats.trafficLightCycle = trafficLightCycle;
  trafficStats.timestamp = Date.now();
  
  res.json({ success: true, stats: trafficStats });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`[Server] Traffic Simulation API running on http://localhost:${PORT}`);
  console.log(`[Server] Endpoints:`);
  console.log(`  GET  /api/status    - Get current traffic statistics`);
  console.log(`  GET  /api/params    - Get simulation parameters`);
  console.log(`  POST /api/params    - Update simulation parameters`);
  console.log(`  POST /api/stats     - Push client-side stats`);
  console.log(`  GET  /api/health    - Health check`);
});
