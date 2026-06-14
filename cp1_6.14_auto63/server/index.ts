import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function readJson<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJson<T>(filename: string, data: T[]): void {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

function initDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(path.join(DATA_DIR, 'members.json'))) {
    writeJson('members.json', [
      { id: 'm1', name: '张明' },
      { id: 'm2', name: '李华' },
      { id: 'm3', name: '王芳' },
      { id: 'm4', name: '赵军' },
      { id: 'm5', name: '陈静' },
    ]);
  }

  if (!fs.existsSync(path.join(DATA_DIR, 'books.json'))) {
    writeJson('books.json', [
      {
        id: 'b1',
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        isbn: '978-7-5442-4490-7',
        coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20One%20Hundred%20Years%20of%20Solitude%20magical%20realism&image_size=square',
        category: '文学',
        currentHolder: '张明',
        status: '流转中',
        rotationQueue: ['李华', '王芳', '赵军', '陈静'],
        circulationLog: [
          { holder: '张明', date: '2026-05-01', action: '借出' },
        ],
        totalPages: 360,
      },
      {
        id: 'b2',
        title: '时间简史',
        author: '史蒂芬·霍金',
        isbn: '978-7-5357-6559-8',
        coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20A%20Brief%20History%20of%20Time%20cosmos&image_size=square',
        category: '科普',
        currentHolder: null,
        status: '待借出',
        rotationQueue: ['赵军', '陈静', '张明', '李华'],
        circulationLog: [],
        totalPages: 256,
      },
      {
        id: 'b3',
        title: '人类简史',
        author: '尤瓦尔·赫拉利',
        isbn: '978-7-5086-5388-3',
        coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20Sapiens%20history%20humanity&image_size=square',
        category: '历史',
        currentHolder: '王芳',
        status: '流转中',
        rotationQueue: ['赵军', '陈静', '张明'],
        circulationLog: [
          { holder: '李华', date: '2026-04-10', action: '借出' },
          { holder: '李华', date: '2026-05-05', action: '归还' },
          { holder: '王芳', date: '2026-05-06', action: '借出' },
        ],
        totalPages: 440,
      },
      {
        id: 'b4',
        title: '苏菲的世界',
        author: '乔斯坦·贾德',
        isbn: '978-7-5063-2854-7',
        coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20Sophies%20World%20philosophy&image_size=square',
        category: '哲学',
        currentHolder: '陈静',
        status: '流转中',
        rotationQueue: ['张明', '李华', '王芳', '赵军'],
        circulationLog: [
          { holder: '陈静', date: '2026-05-15', action: '借出' },
        ],
        totalPages: 535,
      },
      {
        id: 'b5',
        title: '艺术的故事',
        author: '贡布里希',
        isbn: '978-7-5633-5453-1',
        coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=book%20cover%20The%20Story%20of%20Art%20painting&image_size=square',
        category: '艺术',
        currentHolder: null,
        status: '已完成',
        rotationQueue: [],
        circulationLog: [
          { holder: '张明', date: '2026-03-01', action: '借出' },
          { holder: '张明', date: '2026-03-20', action: '归还' },
          { holder: '李华', date: '2026-03-21', action: '借出' },
          { holder: '李华', date: '2026-04-10', action: '归还' },
          { holder: '王芳', date: '2026-04-11', action: '借出' },
          { holder: '王芳', date: '2026-05-01', action: '归还' },
        ],
        totalPages: 688,
      },
    ]);
  }

  if (!fs.existsSync(path.join(DATA_DIR, 'meetings.json'))) {
    writeJson('meetings.json', [
      {
        id: 'mt1',
        topic: '百年孤独讨论会',
        dateTime: '2026-06-20T14:00:00',
        bookId: 'b1',
        location: '咖啡馆三楼',
        participants: ['m1', 'm2', 'm3'],
        createdAt: '2026-06-01T10:00:00',
      },
      {
        id: 'mt2',
        topic: '人类简史读书分享',
        dateTime: '2026-07-05T15:00:00',
        bookId: 'b3',
        location: 'https://meeting.example.com/room/123',
        participants: ['m2', 'm3', 'm4', 'm5'],
        createdAt: '2026-06-10T09:00:00',
      },
      {
        id: 'mt3',
        topic: '艺术的故事回顾',
        dateTime: '2026-05-10T10:00:00',
        bookId: 'b5',
        location: '图书馆二楼',
        participants: ['m1', 'm2', 'm5'],
        createdAt: '2026-04-25T08:00:00',
      },
    ]);
  }

  if (!fs.existsSync(path.join(DATA_DIR, 'progress.json'))) {
    writeJson('progress.json', [
      { id: 'p1', bookId: 'b1', memberId: 'm1', currentPage: 120, totalPages: 360, notes: '魔幻现实主义的开篇很吸引人', updatedAt: '2026-06-05T20:00:00' },
      { id: 'p2', bookId: 'b1', memberId: 'm1', currentPage: 240, totalPages: 360, notes: '布恩迪亚家族的命运令人唏嘘', updatedAt: '2026-06-12T21:00:00' },
      { id: 'p3', bookId: 'b3', memberId: 'm2', currentPage: 200, totalPages: 440, notes: '认知革命部分观点新颖', updatedAt: '2026-05-15T19:00:00' },
      { id: 'p4', bookId: 'b3', memberId: 'm3', currentPage: 150, totalPages: 440, notes: '农业革命是史上最大骗局？', updatedAt: '2026-06-08T20:30:00' },
      { id: 'p5', bookId: 'b4', memberId: 'm5', currentPage: 300, totalPages: 535, notes: '哲学入门非常友好', updatedAt: '2026-06-10T18:00:00' },
    ]);
  }
}

initDataFiles();

app.get('/api/books', (_req, res) => {
  const books = readJson<any>('books.json');
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const books = readJson<any>('books.json');
  const book = books.find((b: any) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const progress = readJson<any>('progress.json').filter((p: any) => p.bookId === req.params.id);
  res.json({ ...book, progress });
});

app.post('/api/books', (req, res) => {
  const books = readJson<any>('books.json');
  const members = readJson<any>('members.json');
  const newBook = {
    id: uuidv4(),
    title: req.body.title || '',
    author: req.body.author || '',
    isbn: req.body.isbn || '',
    coverUrl: req.body.coverUrl || '',
    category: req.body.category || '文学',
    currentHolder: null,
    status: '待借出',
    rotationQueue: members.map((m: any) => m.name),
    circulationLog: [],
    totalPages: req.body.totalPages || 0,
  };
  books.push(newBook);
  writeJson('books.json', books);
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const books = readJson<any>('books.json');
  const idx = books.findIndex((b: any) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book not found' });
  books[idx] = { ...books[idx], ...req.body, id: books[idx].id };
  writeJson('books.json', books);
  res.json(books[idx]);
});

app.put('/api/books/:id/assign', (req, res) => {
  const books = readJson<any>('books.json');
  const idx = books.findIndex((b: any) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Book not found' });

  const book = books[idx];

  if (book.currentHolder) {
    book.circulationLog.push({
      holder: book.currentHolder,
      date: new Date().toISOString().split('T')[0],
      action: '归还',
    });
  }

  if (book.rotationQueue.length > 0) {
    const nextHolder = book.rotationQueue.shift();
    book.currentHolder = nextHolder;
    book.status = '流转中';
    book.circulationLog.push({
      holder: nextHolder,
      date: new Date().toISOString().split('T')[0],
      action: '借出',
    });
  } else {
    book.currentHolder = null;
    book.status = '已完成';
  }

  writeJson('books.json', books);
  res.json(book);
});

app.get('/api/members', (_req, res) => {
  const members = readJson<any>('members.json');
  res.json(members);
});

app.get('/api/members/:id', (req, res) => {
  const members = readJson<any>('members.json');
  const member = members.find((m: any) => m.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const books = readJson<any>('books.json');
  const progress = readJson<any>('progress.json');
  const progressForMember = progress.filter((p: any) => p.memberId === req.params.id);
  const heldBooks = books.filter((b: any) => b.currentHolder === member.name);

  res.json({ ...member, heldBooks, progressUpdates: progressForMember });
});

app.post('/api/members', (req, res) => {
  const members = readJson<any>('members.json');
  const newMember = { id: uuidv4(), name: req.body.name || '' };
  members.push(newMember);
  writeJson('members.json', members);
  res.status(201).json(newMember);
});

app.get('/api/meetings', (_req, res) => {
  const meetings = readJson<any>('meetings.json');
  const sorted = [...meetings].sort((a: any, b: any) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  res.json(sorted);
});

app.post('/api/meetings', (req, res) => {
  const meetings = readJson<any>('meetings.json');
  const newMeeting = {
    id: uuidv4(),
    topic: req.body.topic || '',
    dateTime: req.body.dateTime || '',
    bookId: req.body.bookId || null,
    location: req.body.location || '',
    participants: req.body.participants || [],
    createdAt: new Date().toISOString(),
  };
  meetings.push(newMeeting);
  writeJson('meetings.json', meetings);
  res.status(201).json(newMeeting);
});

app.delete('/api/meetings/:id', (req, res) => {
  let meetings = readJson<any>('meetings.json');
  const idx = meetings.findIndex((m: any) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
  meetings = meetings.filter((m: any) => m.id !== req.params.id);
  writeJson('meetings.json', meetings);
  res.json({ success: true });
});

app.put('/api/progress', (req, res) => {
  const progress = readJson<any>('progress.json');
  const { bookId, memberId, currentPage, notes } = req.body;

  const newEntry = {
    id: uuidv4(),
    bookId,
    memberId,
    currentPage: Number(currentPage),
    totalPages: req.body.totalPages || 0,
    notes: notes || '',
    updatedAt: new Date().toISOString(),
  };
  progress.push(newEntry);
  writeJson('progress.json', progress);
  res.status(201).json(newEntry);
});

app.get('/api/progress/:memberId', (req, res) => {
  const progress = readJson<any>('progress.json');
  const memberProgress = progress.filter((p: any) => p.memberId === req.params.memberId);
  res.json(memberProgress);
});

app.get('/api/stats', (_req, res) => {
  const members = readJson<any>('members.json');
  const books = readJson<any>('books.json');
  const progress = readJson<any>('progress.json');
  const meetings = readJson<any>('meetings.json');

  const stats = members.map((member: any) => {
    const memberProgress = progress.filter((p: any) => p.memberId === member.id);
    const totalPagesRead = memberProgress.reduce((sum: number, p: any) => sum + p.currentPage, 0);
    const bookIds = [...new Set(memberProgress.map((p: any) => p.bookId))];
    const booksCompleted = bookIds.filter((bookId: string) => {
      const bookProgress = memberProgress.filter((p: any) => p.bookId === bookId);
      const latest = bookProgress.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      return latest && latest.currentPage >= latest.totalPages;
    }).length;

    let avgDaysPerBook = 0;
    if (bookIds.length > 0) {
      const bookDays = bookIds.map((bookId: string) => {
        const bookProgress = memberProgress.filter((p: any) => p.bookId === bookId);
        if (bookProgress.length < 2) return 1;
        const sorted = bookProgress.sort((a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        const first = new Date(sorted[0].updatedAt);
        const last = new Date(sorted[sorted.length - 1].updatedAt);
        return Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
      });
      avgDaysPerBook = Math.round(bookDays.reduce((a: number, b: number) => a + b, 0) / bookDays.length);
    }

    const meetingCount = meetings.filter((m: any) => m.participants.includes(member.id)).length;

    return {
      memberId: member.id,
      memberName: member.name,
      totalPagesRead,
      avgDaysPerBook,
      meetingCount,
      booksCompleted,
    };
  });

  res.json(stats);
});

app.get('/api/stats/export', (_req, res) => {
  const books = readJson<any>('books.json');
  const members = readJson<any>('members.json');
  const progress = readJson<any>('progress.json');
  const meetings = readJson<any>('meetings.json');

  const report = {
    exportDate: new Date().toISOString(),
    books: books.map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      status: b.status,
      currentHolder: b.currentHolder,
      circulationLog: b.circulationLog,
    })),
    memberStats: members.map((member: any) => {
      const memberProgress = progress.filter((p: any) => p.memberId === member.id);
      const totalPagesRead = memberProgress.reduce((sum: number, p: any) => sum + p.currentPage, 0);
      const meetingCount = meetings.filter((m: any) => m.participants.includes(member.id)).length;
      return {
        memberId: member.id,
        memberName: member.name,
        totalPagesRead,
        meetingCount,
      };
    }),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=reading-club-report.json');
  res.json(report);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
