import { Router, type Request, type Response } from 'express';
import { getDecks, createDeck, deleteDeck, addCard, deleteCard, reorderCards } from '../data/store.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  res.json(getDecks());
});

router.post('/', (req: Request, res: Response): void => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const deck = createDeck(name, description || '');
  res.status(201).json(deck);
});

router.delete('/:id', (req: Request, res: Response): void => {
  const success = deleteDeck(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/:id/cards', (req: Request, res: Response): void => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    res.status(400).json({ error: 'question and answer are required' });
    return;
  }
  const card = addCard(req.params.id, question, answer);
  if (!card) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  res.status(201).json(card);
});

router.delete('/:deckId/cards/:cardId', (req: Request, res: Response): void => {
  const success = deleteCard(req.params.deckId, req.params.cardId);
  if (!success) {
    res.status(404).json({ error: 'Deck or card not found' });
    return;
  }
  res.json({ success: true });
});

router.put('/:id/cards/reorder', (req: Request, res: Response): void => {
  const { cardIds } = req.body;
  if (!Array.isArray(cardIds)) {
    res.status(400).json({ error: 'cardIds must be an array' });
    return;
  }
  const success = reorderCards(req.params.id, cardIds);
  if (!success) {
    res.status(404).json({ error: 'Deck not found or invalid cardIds' });
    return;
  }
  res.json({ success: true });
});

export default router;
