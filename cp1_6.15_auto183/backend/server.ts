import express from 'express';
import cors from 'cors';
import challengesRouter from './routes/challenges';
import pointsRouter from './routes/points';
import rewardsRouter from './routes/rewards';
import './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/challenges', challengesRouter);
app.use('/api/points', pointsRouter);
app.use('/api', rewardsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
