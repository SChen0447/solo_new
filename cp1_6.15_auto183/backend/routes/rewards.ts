import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { rewardQueries, exchangeQueries, userQueries, pointsQueries } from '../db';

const router = Router();

router.get('/rewards', (_req: Request, res: Response) => {
  const rewards = rewardQueries.getAll.all();
  res.json(rewards);
});

router.post('/exchange', (req: Request, res: Response) => {
  const { userId, rewardId } = req.body;

  if (!userId || !rewardId) {
    return res.status(400).json({ error: 'userId and rewardId are required' });
  }

  const user = userQueries.getById.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const reward = rewardQueries.getById.get(rewardId);
  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  if (user.points < reward.cost) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  const now = Date.now();
  const exchangeId = uuidv4();
  exchangeQueries.insert.run(exchangeId, userId, rewardId, reward.cost, now);

  userQueries.updatePoints.run(-reward.cost, userId);

  const pointsId = uuidv4();
  pointsQueries.insert.run(pointsId, userId, 'exchange', -reward.cost, `兑换：${reward.name}`, now);

  const updatedUser = userQueries.getById.get(userId);
  const records = exchangeQueries.getByUserId.all(userId);

  res.json({ user: updatedUser, exchangeRecords: records });
});

router.get('/exchange/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const records = exchangeQueries.getByUserId.all(userId);
  res.json(records);
});

export default router;
