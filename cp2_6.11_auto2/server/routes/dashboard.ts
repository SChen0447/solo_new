import { Router, type Request, type Response } from 'express';
import { getDashboardData } from '../data/store.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  res.json(getDashboardData());
});

export default router;
