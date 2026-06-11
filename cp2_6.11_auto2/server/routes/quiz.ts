import { Router, type Request, type Response } from 'express';
import { getRandomCards, addQuizResult } from '../data/store.js';

const router = Router();

router.get('/random', (req: Request, res: Response): void => {
  const { deckId } = req.query;
  const count = parseInt(req.query.count as string, 10) || 10;
  if (!deckId || typeof deckId !== 'string') {
    res.status(400).json({ error: 'deckId query parameter is required' });
    return;
  }
  const cards = getRandomCards(deckId, count);
  res.json(cards);
});

router.post('/result', (req: Request, res: Response): void => {
  const { score, total, deckId } = req.body;
  if (score === undefined || total === undefined || !deckId) {
    res.status(400).json({ error: 'score, total, and deckId are required' });
    return;
  }
  const result = addQuizResult(score, total, deckId);
  res.status(201).json(result);
});

export default router;
