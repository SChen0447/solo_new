import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { challengeQueries, pointsQueries, userQueries } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const challenges = challengeQueries.getAll.all();
  res.json(challenges);
});

router.post('/:id/like', (req: Request, res: Response) => {
  const { id } = req.params;
  const challenge = challengeQueries.getById.get(id);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }
  challengeQueries.addLike.run(id);
  const updated = challengeQueries.getById.get(id);
  res.json(updated);
});

router.post('/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const challenge = challengeQueries.getById.get(id);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  const existing = challengeQueries.getParticipant.get(id, userId);
  if (existing) {
    return res.status(400).json({ error: 'Already joined this challenge' });
  }

  const participantId = uuidv4();
  const now = Date.now();

  challengeQueries.insertParticipant.run(participantId, id, userId, null, 0, now);
  challengeQueries.addParticipant.run(id);

  const pointsId = uuidv4();
  pointsQueries.insert.run(pointsId, userId, 'join_challenge', 20, `参与挑战：${challenge.title}`, now);
  userQueries.updatePoints.run(20, userId);

  const updatedChallenge = challengeQueries.getById.get(id);
  const user = userQueries.getById.get(userId);

  res.json({ challenge: updatedChallenge, user });
});

export default router;
