import { Router, type Request, type Response } from 'express';
import { getGroups, createGroup, joinGroup, leaveGroup } from '../data/store.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  res.json(getGroups());
});

router.post('/', (req: Request, res: Response): void => {
  const { name, creator, deckId } = req.body;
  if (!name || !creator || !deckId) {
    res.status(400).json({ error: 'name, creator, and deckId are required' });
    return;
  }
  const group = createGroup(name, creator, deckId);
  res.status(201).json(group);
});

router.post('/:id/join', (req: Request, res: Response): void => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  const group = joinGroup(req.params.id, userId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json(group);
});

router.post('/:id/leave', (req: Request, res: Response): void => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  const group = leaveGroup(req.params.id, userId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json(group);
});

export default router;
