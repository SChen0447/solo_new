import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const BOOKS_FILE = path.join(__dirname, 'data', 'books.json');
const REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');

const readJSONFile = (filePath: string) => {
  return new Promise<any[]>((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
};

const writeJSONFile = (filePath: string, data: any[]) => {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

app.get('/api/books', async (_req, res) => {
  try {
    const books = await readJSONFile(BOOKS_FILE);
    const reviews = await readJSONFile(REVIEWS_FILE);
    
    const booksWithReviewCount = books.map(book => ({
      ...book,
      reviewCount: reviews.filter(r => r.bookId === book.id).length
    }));
    
    res.json(booksWithReviewCount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const books = await readJSONFile(BOOKS_FILE);
    const book = books.find(b => b.id === req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const books = await readJSONFile(BOOKS_FILE);
    const newBook = {
      ...req.body,
      id: uuidv4()
    };
    books.push(newBook);
    await writeJSONFile(BOOKS_FILE, books);
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const books = await readJSONFile(BOOKS_FILE);
    const index = books.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }
    books[index] = { ...books[index], ...req.body };
    await writeJSONFile(BOOKS_FILE, books);
    res.json(books[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const bookId = req.query.bookId as string;
    let reviews = await readJSONFile(REVIEWS_FILE);
    
    if (bookId) {
      reviews = reviews.filter(r => r.bookId === bookId);
    }
    
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const reviews = await readJSONFile(REVIEWS_FILE);
    const newReview = {
      ...req.body,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    reviews.push(newReview);
    await writeJSONFile(REVIEWS_FILE, reviews);
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
