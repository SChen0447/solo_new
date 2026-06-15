import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const readJsonFile = (filename: string) => {
  const filePath = path.join(dataDir, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = (filename: string, data: unknown) => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/books', (_req, res) => {
  try {
    const books = readJsonFile('books.json');
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read books data' });
  }
});

app.get('/api/books/:id', (req, res) => {
  try {
    const books = readJsonFile('books.json');
    const book = books.find((b: { id: string }) => b.id === req.params.id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      res.json(book);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read book data' });
  }
});

app.post('/api/books', (req, res) => {
  try {
    const books = readJsonFile('books.json');
    const newBook = {
      id: `b${uuidv4().slice(0, 8)}`,
      status: 'available',
      ...req.body
    };
    books.push(newBook);
    writeJsonFile('books.json', books);
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const books = readJsonFile('books.json');
    const index = books.findIndex((b: { id: string }) => b.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      books[index] = { ...books[index], ...req.body };
      writeJsonFile('books.json', books);
      res.json(books[index]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const books = readJsonFile('books.json');
    const filtered = books.filter((b: { id: string }) => b.id !== req.params.id);
    if (filtered.length === books.length) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      writeJsonFile('books.json', filtered);
      res.json({ message: 'Book deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

app.get('/api/borrows', (_req, res) => {
  try {
    const borrows = readJsonFile('borrows.json');
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read borrows data' });
  }
});

app.get('/api/borrows/book/:bookId', (req, res) => {
  try {
    const borrows = readJsonFile('borrows.json');
    const bookBorrows = borrows.filter(
      (b: { bookId: string }) => b.bookId === req.params.bookId
    );
    res.json(bookBorrows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read borrow data' });
  }
});

app.post('/api/borrows', (req, res) => {
  try {
    const borrows = readJsonFile('borrows.json');
    const books = readJsonFile('books.json');

    const newBorrow = {
      id: `br${uuidv4().slice(0, 8)}`,
      returnDate: null,
      status: 'borrowed',
      ...req.body
    };
    borrows.push(newBorrow);
    writeJsonFile('borrows.json', borrows);

    const bookIndex = books.findIndex(
      (b: { id: string }) => b.id === req.body.bookId
    );
    if (bookIndex !== -1) {
      books[bookIndex].status = 'borrowed';
      writeJsonFile('books.json', books);
    }

    res.status(201).json(newBorrow);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create borrow record' });
  }
});

app.put('/api/borrows/:id/return', (req, res) => {
  try {
    const borrows = readJsonFile('borrows.json');
    const books = readJsonFile('books.json');
    const index = borrows.findIndex(
      (b: { id: string }) => b.id === req.params.id
    );

    if (index === -1) {
      res.status(404).json({ error: 'Borrow record not found' });
    } else {
      const returnDate = req.body.returnDate || new Date().toISOString().split('T')[0];
      borrows[index] = {
        ...borrows[index],
        returnDate,
        status: 'returned'
      };
      writeJsonFile('borrows.json', borrows);

      const bookId = borrows[index].bookId;
      const bookIndex = books.findIndex((b: { id: string }) => b.id === bookId);
      if (bookIndex !== -1) {
        books[bookIndex].status = 'available';
        writeJsonFile('books.json', books);
      }

      res.json(borrows[index]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process return' });
  }
});

app.get('/api/locations', (_req, res) => {
  try {
    const locations = readJsonFile('locations.json');
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read locations data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
