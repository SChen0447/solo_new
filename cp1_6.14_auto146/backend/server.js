import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, '..', 'data', 'books.json');

app.use(cors());
app.use(express.json());

const readBooks = () => {
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeBooks = (books) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2), 'utf-8');
};

app.get('/api/books', (req, res) => {
  const { q, condition } = req.query;
  let books = readBooks();

  if (q) {
    const query = q.toString().toLowerCase();
    books = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
  }

  if (condition) {
    books = books.filter((book) => book.condition === condition);
  }

  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const books = readBooks();
  const book = books.find((b) => b.id === req.params.id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(book);
});

app.post('/api/books/:id/borrow', (req, res) => {
  const books = readBooks();
  const bookIndex = books.findIndex((b) => b.id === req.params.id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const { borrower, returnDate } = req.body;
  const book = books[bookIndex];

  book.status = 'borrowed';
  book.borrower = borrower;
  book.borrowDate = new Date().toISOString().split('T')[0];
  book.expectedReturnDate = returnDate;

  const historyEntry = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    event: 'borrow',
    description: `${borrower} 借走了这本书`,
    person: borrower
  };
  book.pathHistory.push(historyEntry);

  writeBooks(books);
  res.json(book);
});

app.post('/api/books/:id/return', (req, res) => {
  const books = readBooks();
  const bookIndex = books.findIndex((b) => b.id === req.params.id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const book = books[bookIndex];
  const returner = book.borrower;

  book.status = 'available';
  book.borrowCount = (book.borrowCount || 0) + 1;
  book.currentHolder = returner || book.currentHolder;
  book.borrower = null;
  book.borrowDate = null;
  book.expectedReturnDate = null;

  const historyEntry = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    event: 'return',
    description: `${returner} 归还了书籍`,
    person: returner
  };
  book.pathHistory.push(historyEntry);

  writeBooks(books);
  res.json(book);
});

app.post('/api/books/:id/request', (req, res) => {
  const books = readBooks();
  const bookIndex = books.findIndex((b) => b.id === req.params.id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const { requester } = req.body;
  const book = books[bookIndex];

  book.status = 'pending';
  book.requester = requester;

  const historyEntry = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    event: 'request',
    description: `${requester} 申请借阅`,
    person: requester
  };
  book.pathHistory.push(historyEntry);

  writeBooks(books);
  res.json(book);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
