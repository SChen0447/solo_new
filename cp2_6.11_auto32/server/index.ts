import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Comment {
  id: string;
  lineNumber: number;
  emoji: string;
  text: string;
  createdAt: number;
}

interface Snippet {
  id: string;
  shortId: string;
  code: string;
  language: string;
  createdAt: number;
  comments: Comment[];
}

type ReactionType = 'like' | 'confused' | 'clap' | 'heart';

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  confused: '❓',
  clap: '👏',
  heart: '❤️',
};

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const snippets: Map<string, Snippet> = new Map();
const shortIdToId: Map<string, string> = new Map();

function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getPublicSnippet(snippet: Snippet) {
  return {
    id: snippet.id,
    shortId: snippet.shortId,
    code: snippet.code,
    language: snippet.language,
    createdAt: snippet.createdAt,
    comments: snippet.comments,
  };
}

app.post('/api/snippets', (req: Request, res: Response) => {
  const { code, language } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '代码内容不能为空' });
  }

  if (!language || !['javascript', 'python', 'java', 'html', 'css'].includes(language)) {
    return res.status(400).json({ error: '不支持的编程语言' });
  }

  let shortId: string;
  do {
    shortId = generateShortId();
  } while (shortIdToId.has(shortId));

  const id = uuidv4();
  const snippet: Snippet = {
    id,
    shortId,
    code,
    language,
    createdAt: Date.now(),
    comments: [],
  };

  snippets.set(id, snippet);
  shortIdToId.set(shortId, id);

  res.status(201).json(getPublicSnippet(snippet));
});

app.get('/api/snippets', (req: Request, res: Response) => {
  const { language } = req.query;
  let all = Array.from(snippets.values());

  if (language && typeof language === 'string' && language !== 'all') {
    all = all.filter((s) => s.language === language);
  }

  all.sort((a, b) => b.createdAt - a.createdAt);
  const result = all.slice(0, 10).map((s) => ({
    ...getPublicSnippet(s),
    commentCount: s.comments.length,
  }));

  res.json(result);
});

app.get('/api/snippets/:shortId', (req: Request, res: Response) => {
  const { shortId } = req.params;
  const id = shortIdToId.get(shortId);

  if (!id || !snippets.has(id)) {
    return res.status(404).json({ error: '片段不存在' });
  }

  const snippet = snippets.get(id)!;
  res.json(getPublicSnippet(snippet));
});

app.post('/api/snippets/:shortId/comments', (req: Request, res: Response) => {
  const { shortId } = req.params;
  const { lineNumber, emoji, text } = req.body;
  const id = shortIdToId.get(shortId);

  if (!id || !snippets.has(id)) {
    return res.status(404).json({ error: '片段不存在' });
  }

  if (typeof lineNumber !== 'number' || lineNumber < 1) {
    return res.status(400).json({ error: '无效的行号' });
  }

  if (!Object.values(REACTION_EMOJIS).includes(emoji)) {
    return res.status(400).json({ error: '无效的表情' });
  }

  const snippet = snippets.get(id)!;
  const comment: Comment = {
    id: uuidv4(),
    lineNumber,
    emoji,
    text: typeof text === 'string' ? text : '',
    createdAt: Date.now(),
  };

  snippet.comments.push(comment);

  io.to(`snippet:${shortId}`).emit('new-comment', {
    shortId,
    comment,
  });

  res.status(201).json(comment);
});

io.on('connection', (socket) => {
  socket.on('join-snippet', (shortId: string) => {
    socket.join(`snippet:${shortId}`);
  });

  socket.on('leave-snippet', (shortId: string) => {
    socket.leave(`snippet:${shortId}`);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
