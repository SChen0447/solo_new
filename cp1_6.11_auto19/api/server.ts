import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface Question {
  id: string;
  content: string;
  timestamp: number;
  avatarSeed: string;
  answered: boolean;
  likes: number;
  likedBy: string[];
}

let questions: Question[] = [];

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('questions:init', { questions });

  socket.on('question:submit', (payload: { content: string }) => {
    const question: Question = {
      id: uuidv4(),
      content: payload.content.slice(0, 100),
      timestamp: Date.now(),
      avatarSeed: Math.random().toString(36).substring(2, 10),
      answered: false,
      likes: 0,
      likedBy: [],
    };
    questions.unshift(question);
    io.emit('question:new', { question });
  });

  socket.on('question:answer', (payload: { questionId: string }) => {
    const q = questions.find((item) => item.id === payload.questionId);
    if (q) {
      q.answered = true;
      io.emit('question:answered', { questionId: payload.questionId });
    }
  });

  socket.on('question:like', (payload: { questionId: string; studentId: string }) => {
    const q = questions.find((item) => item.id === payload.questionId);
    if (q && !q.likedBy.includes(payload.studentId)) {
      q.likedBy.push(payload.studentId);
      q.likes = q.likedBy.length;
      io.emit('question:liked', {
        questionId: payload.questionId,
        likes: q.likes,
        likedBy: [...q.likedBy],
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  io.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  io.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
