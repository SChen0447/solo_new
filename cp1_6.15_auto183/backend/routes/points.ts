import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pointsQueries, userQueries } from '../db';

const router = Router();

router.get('/leaderboard', (_req: Request, res: Response) => {
  const leaderboard = pointsQueries.getLeaderboard.all();
  res.json(leaderboard);
});

router.get('/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = userQueries.getById.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ points: user.points });
});

router.post('/:userId/add', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { points, action = 'bonus', description = '' } = req.body;

  if (typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ error: 'Valid points number is required' });
  }

  const user = userQueries.getById.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const id = uuidv4();
  const now = Date.now();
  pointsQueries.insert.run(id, userId, action, points, description, now);
  userQueries.updatePoints.run(points, userId);

  const updatedUser = userQueries.getById.get(userId);
  res.json(updatedUser);
});

router.get('/:userId/history', (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const history = pointsQueries.getHistory.all(userId, limit, offset);
  res.json(history);
});

export default router;
