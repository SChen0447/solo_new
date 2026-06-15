import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomCopies, getRandomAuthorColor, getRandomAnimalIcon, shuffleArray } from './copyTemplates';
import type {
  DebateSession,
  GenerateParams,
  GenerateResponse,
  CommentParams,
  CommentResponse,
  LikeParams,
  LikeResponse,
  VoteParams,
  VoteResponse,
  Round2Response,
  FinishResponse,
  HistoryResponse,
  HistoryDetailResponse,
  Comment,
  CopyItem,
  RankingItem
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'data.json');

function readData(): { sessions: DebateSession[] } {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { sessions: [] };
  }
}

function writeData(data: { sessions: DebateSession[] }): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const router = express.Router();

router.post('/generate', async (req: Request<{}, {}, GenerateParams>, res: Response<GenerateResponse>) => {
  await delay(400 + Math.random() * 100);
  
  const { productName, targetAudience, keySellingPoints } = req.body;
  
  if (!productName || !targetAudience || !keySellingPoints) {
    res.status(400).json({} as GenerateResponse);
    return;
  }
  
  const copies = generateRandomCopies(productName, targetAudience, keySellingPoints, 4);
  
  const session: DebateSession = {
    id: uuidv4(),
    productName,
    targetAudience,
    keySellingPoints,
    copies,
    round: 1,
    topCopiesForRound2: [],
    votes: {},
    createdAt: Date.now(),
    finalRankings: []
  };
  
  const data = readData();
  data.sessions.push(session);
  writeData(data);
  
  res.json({
    sessionId: session.id,
    copies: session.copies
  });
});

router.post('/comment', async (req: Request<{}, {}, CommentParams>, res: Response<CommentResponse>) => {
  await delay(100);
  
  const { sessionId, copyId, content } = req.body;
  
  if (!sessionId || !copyId || !content || content.length > 200) {
    res.status(400).json({} as CommentResponse);
    return;
  }
  
  const data = readData();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    res.status(404).json({} as CommentResponse);
    return;
  }
  
  const copy = session.copies.find(c => c.id === copyId);
  
  if (!copy) {
    res.status(404).json({} as CommentResponse);
    return;
  }
  
  const comment: Comment = {
    id: uuidv4(),
    content,
    timestamp: Date.now(),
    authorColor: getRandomAuthorColor(),
    likes: 0
  };
  
  copy.comments.push(comment);
  writeData(data);
  
  res.json({ comment });
});

router.get('/round2/:sessionId', async (req: Request<{ sessionId: string }>, res: Response<Round2Response>) => {
  await delay(100);
  
  const { sessionId } = req.params;
  const data = readData();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    res.status(404).json({ topCopies: [] });
    return;
  }
  
  const sortedCopies = [...session.copies].sort((a, b) => b.comments.length - a.comments.length);
  const top2 = sortedCopies.slice(0, 2);
  
  const topCopiesWithAnonymousComments: CopyItem[] = top2.map(copy => {
    const commentsWithAnimals = copy.comments.map(comment => ({
      ...comment,
      animalIcon: getRandomAnimalIcon()
    }));
    
    return {
      ...copy,
      comments: shuffleArray(commentsWithAnimals)
    };
  });
  
  session.topCopiesForRound2 = top2.map(c => c.id);
  session.round = 2;
  writeData(data);
  
  res.json({ topCopies: topCopiesWithAnonymousComments });
});

router.post('/like', async (req: Request<{}, {}, LikeParams>, res: Response<LikeResponse>) => {
  await delay(100);
  
  const { sessionId, copyId, commentId } = req.body;
  
  if (!sessionId || !copyId || !commentId) {
    res.status(400).json({ likes: 0 });
    return;
  }
  
  const data = readData();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    res.status(404).json({ likes: 0 });
    return;
  }
  
  const copy = session.copies.find(c => c.id === copyId);
  
  if (!copy) {
    res.status(404).json({ likes: 0 });
    return;
  }
  
  const comment = copy.comments.find(c => c.id === commentId);
  
  if (!comment) {
    res.status(404).json({ likes: 0 });
    return;
  }
  
  comment.likes += 1;
  writeData(data);
  
  res.json({ likes: comment.likes });
});

router.post('/vote', async (req: Request<{}, {}, VoteParams>, res: Response<VoteResponse>) => {
  await delay(100);
  
  const { sessionId, copyId } = req.body;
  
  if (!sessionId || !copyId) {
    res.status(400).json({ success: false });
    return;
  }
  
  const data = readData();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    res.status(404).json({ success: false });
    return;
  }
  
  const copy = session.copies.find(c => c.id === copyId);
  
  if (!copy) {
    res.status(404).json({ success: false });
    return;
  }
  
  session.votes[copyId] = (session.votes[copyId] || 0) + 1;
  copy.votes = session.votes[copyId];
  
  writeData(data);
  
  res.json({ success: true });
});

router.post('/finish/:sessionId', async (req: Request<{ sessionId: string }>, res: Response<FinishResponse>) => {
  await delay(200);
  
  const { sessionId } = req.params;
  const data = readData();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    res.status(404).json({ rankings: [] });
    return;
  }
  
  const totalVotes = Object.values(session.votes).reduce((sum, v) => sum + v, 0);
  
  const rankings: RankingItem[] = session.copies
    .map(copy => ({
      copyId: copy.id,
      content: copy.content,
      votes: session.votes[copy.id] || 0,
      percentage: totalVotes > 0 ? Math.round(((session.votes[copy.id] || 0) / totalVotes) * 100) : 0
    }))
    .sort((a, b) => b.votes - a.votes);
  
  session.round = 4;
  session.completedAt = Date.now();
  session.finalRankings = rankings;
  writeData(data);
  
  res.json({ rankings });
});

router.get('/history', async (_req: Request, res: Response<HistoryResponse>) => {
  await delay(100);
  
  const data = readData();
  const sessions = [...data.sessions]
    .filter(s => s.round === 4)
    .sort((a, b) => b.createdAt - a.createdAt);
  
  res.json({ sessions });
});

router.get('/history/:id', async (req: Request<{ id: string }>, res: Response<HistoryDetailResponse>) => {
  await delay(100);
  
  const { id } = req.params;
  const data = readData();
  const session = data.sessions.find(s => s.id === id);
  
  if (!session) {
    res.status(404).json({} as HistoryDetailResponse);
    return;
  }
  
  res.json({ session });
});

export default router;
