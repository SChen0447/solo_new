import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import QuestionWall from './QuestionWall';

export interface Question {
  id: string;
  content: string;
  timestamp: number;
  avatarSeed: string;
  answered: boolean;
  likes: number;
  likedBy: string[];
}

function getStudentId(): string {
  let id = localStorage.getItem('liveqa_student_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('liveqa_student_id', id);
  }
  return id;
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [studentId] = useState(getStudentId);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    setSocket(newSocket);

    newSocket.on('questions:init', (data: { questions: Question[] }) => {
      setQuestions(data.questions);
    });

    newSocket.on('question:new', (data: { question: Question }) => {
      setQuestions((prev) => [data.question, ...prev]);
    });

    newSocket.on('question:answered', (data: { questionId: string }) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.questionId ? { ...q, answered: true } : q
        )
      );
    });

    newSocket.on('question:liked', (data: { questionId: string; likes: number; likedBy: string[] }) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.questionId
            ? { ...q, likes: data.likes, likedBy: data.likedBy }
            : q
        )
      );
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSubmit = useCallback(
    (content: string) => {
      socket?.emit('question:submit', { content });
    },
    [socket]
  );

  const handleAnswer = useCallback(
    (questionId: string) => {
      socket?.emit('question:answer', { questionId });
    },
    [socket]
  );

  const handleLike = useCallback(
    (questionId: string) => {
      socket?.emit('question:like', { questionId, studentId });
    },
    [socket, studentId]
  );

  const toggleTeacher = useCallback(() => {
    setIsTeacher((prev) => !prev);
  }, []);

  return (
    <QuestionWall
      questions={questions}
      onSubmit={handleSubmit}
      onAnswer={handleAnswer}
      onLike={handleLike}
      isTeacher={isTeacher}
      onToggleTeacher={toggleTeacher}
      studentId={studentId}
    />
  );
}
