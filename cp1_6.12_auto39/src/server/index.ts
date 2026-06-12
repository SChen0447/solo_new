import express from 'express';
import { apiRouter } from './api';

const app = express();
const PORT = 3001;

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.send({
    message: 'Tactical Board Game API',
    endpoints: ['GET /api/units', 'GET /api/config'],
  });
});

app.listen(PORT, () => {
  console.log(`[server] Tactical Game API listening on http://localhost:${PORT}`);
});
