import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const SHELF_FILE = path.join(DATA_DIR, 'shelf.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const moodThemes = {
  轻松: 'relaxed',
  烧脑: 'mystery',
  感动: 'emotional',
  冒险: 'adventure',
  relaxed: 'relaxed',
  mystery: 'mystery',
  emotional: 'emotional',
  adventure: 'adventure',
  悬疑: 'mystery',
  治愈: 'relaxed',
};

const moodColors = {
  relaxed: '#8BC9A0',
  mystery: '#2C3E50',
  emotional: '#E74C3C',
  adventure: '#F39C12',
};

app.get('/api/recommendations', (req, res) => {
  const startTime = Date.now();
  const { mood } = req.query;

  fs.readFile(BOOKS_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read books data' });
    }

    try {
      const books = JSON.parse(data);
      let filteredBooks = books;

      if (mood) {
        const moodKey = moodThemes[mood] || mood;
        filteredBooks = books.filter(
          (book) => book.theme === moodKey || book.tags?.includes(mood)
        );
      }

      const shuffled = filteredBooks.sort(() => 0.5 - Math.random());
      const result = shuffled.slice(0, 6).map((book) => ({
        ...book,
        themeColor: moodColors[book.theme] || '#8BC9A0',
      }));

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 100 - elapsed);

      setTimeout(() => {
        res.json(result);
      }, delay);
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse books data' });
    }
  });
});

app.get('/api/shelf', (req, res) => {
  fs.readFile(SHELF_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json({ books: [], layout: [] });
      }
      return res.status(500).json({ error: 'Failed to read shelf data' });
    }

    try {
      const shelfData = JSON.parse(data);
      res.json(shelfData);
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse shelf data' });
    }
  });
});

app.post('/api/shelf', (req, res) => {
  const startTime = Date.now();
  const shelfData = req.body;

  fs.writeFile(SHELF_FILE, JSON.stringify(shelfData, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save shelf data' });
    }

    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, 50 - elapsed);

    setTimeout(() => {
      res.json({ success: true, message: 'Shelf saved successfully' });
    }, delay);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
