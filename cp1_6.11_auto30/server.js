import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let books = [
  {
    id: 'book-1',
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    coverColor: '#3498db',
    createdAt: '2025-01-15'
  },
  {
    id: 'book-2',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    coverColor: '#e74c3c',
    createdAt: '2025-02-10'
  },
  {
    id: 'book-3',
    title: '代码整洁之道',
    author: 'Robert C. Martin',
    coverColor: '#27ae60',
    createdAt: '2025-03-01'
  }
];

let records = [
  { id: 'r1', bookId: 'book-1', date: '2025-06-01', pages: 25, duration: 45 },
  { id: 'r2', bookId: 'book-1', date: '2025-06-02', pages: 30, duration: 50 },
  { id: 'r3', bookId: 'book-1', date: '2025-06-03', pages: 20, duration: 35 },
  { id: 'r4', bookId: 'book-1', date: '2025-06-04', pages: 35, duration: 60 },
  { id: 'r5', bookId: 'book-1', date: '2025-06-05', pages: 28, duration: 48 },
  { id: 'r6', bookId: 'book-1', date: '2025-06-06', pages: 22, duration: 40 },
  { id: 'r7', bookId: 'book-1', date: '2025-06-07', pages: 18, duration: 32 },
  { id: 'r8', bookId: 'book-2', date: '2025-06-01', pages: 40, duration: 70 },
  { id: 'r9', bookId: 'book-2', date: '2025-06-03', pages: 35, duration: 60 },
  { id: 'r10', bookId: 'book-2', date: '2025-06-05', pages: 45, duration: 80 },
  { id: 'r11', bookId: 'book-3', date: '2025-06-02', pages: 15, duration: 25 },
  { id: 'r12', bookId: 'book-3', date: '2025-06-04', pages: 20, duration: 35 },
  { id: 'r13', bookId: 'book-3', date: '2025-06-06', pages: 25, duration: 45 }
];

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, author, coverColor } = req.body;
  if (!title || !author || !coverColor) {
    return res.status(400).json({ error: '书名、作者和封面颜色为必填项' });
  }
  const newBook = {
    id: uuidv4(),
    title,
    author,
    coverColor,
    createdAt: new Date().toISOString().split('T')[0]
  };
  books.push(newBook);
  res.status(201).json(newBook);
});

app.get('/api/books/:id/records', (req, res) => {
  const { id } = req.params;
  const bookRecords = records
    .filter(r => r.bookId === id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(bookRecords);
});

app.post('/api/records', (req, res) => {
  const { bookId, date, pages, duration } = req.body;
  if (!bookId || !date || !pages) {
    return res.status(400).json({ error: '书籍ID、日期和页数为必填项' });
  }
  const existingIndex = records.findIndex(r => r.bookId === bookId && r.date === date);
  if (existingIndex !== -1) {
    records[existingIndex].pages = pages;
    records[existingIndex].duration = duration || records[existingIndex].duration;
    return res.json(records[existingIndex]);
  }
  const newRecord = {
    id: uuidv4(),
    bookId,
    date,
    pages,
    duration: duration || 0
  };
  records.push(newRecord);
  res.status(201).json(newRecord);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
