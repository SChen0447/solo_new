import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import booksRouter from './routes/books';
import floatsRouter from './routes/floats';
import notesRouter from './routes/notes';
import clubsRouter from './routes/clubs';
import authRouter from './routes/auth';
import userRouter from './routes/user';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/books', booksRouter);
app.use('/api/floats', floatsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/clubs', clubsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
