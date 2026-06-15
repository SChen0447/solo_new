import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  Quiz,
  Question,
  Submission,
  StudentAnswer,
  QuestionResult,
  generateInviteCode,
  gradeSubmission
} from '../client/quizEngine';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const quizzes: Map<string, Quiz> = new Map();
const submissions: Map<string, Submission[]> = new Map();
const inviteCodeToQuizId: Map<string, string> = new Map();

app.post('/api/quizzes', (req: Request, res: Response) => {
  try {
    const { title, questions } = req.body as {
      title: string;
      questions: Question[];
    };

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: '测验标题和题目不能为空' });
    }

    const quizId = uuidv4();
    let inviteCode = generateInviteCode();
    while (inviteCodeToQuizId.has(inviteCode)) {
      inviteCode = generateInviteCode();
    }

    const quiz: Quiz = {
      id: quizId,
      inviteCode,
      title,
      questions: questions.map((q) => ({
        ...q,
        id: q.id || uuidv4()
      })),
      isOpen: true,
      createdAt: Date.now()
    };

    quizzes.set(quizId, quiz);
    submissions.set(quizId, []);
    inviteCodeToQuizId.set(inviteCode, quizId);

    res.status(201).json({ quiz, inviteCode });
  } catch (err) {
    console.error('创建测验失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/quizzes/:quizId', (req: Request, res: Response) => {
  const quiz = quizzes.get(req.params.quizId);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }
  const quizWithoutAnswers = {
    ...quiz,
    questions: quiz.questions.map(
      ({ correctAnswer, explanation, ...rest }) => rest as Question
    )
  };
  res.json(quizWithoutAnswers);
});

app.get('/api/quizzes/by-code/:inviteCode', (req: Request, res: Response) => {
  const quizId = inviteCodeToQuizId.get(req.params.inviteCode.toUpperCase());
  if (!quizId) {
    return res.status(404).json({ error: '邀请码无效' });
  }
  const quiz = quizzes.get(quizId);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }
  if (!quiz.isOpen) {
    return res.status(403).json({ error: '测验已关闭提交' });
  }
  const quizWithoutAnswers = {
    ...quiz,
    questions: quiz.questions.map(
      ({ correctAnswer, explanation, ...rest }) => rest as Question
    )
  };
  res.json(quizWithoutAnswers);
});

app.post('/api/quizzes/:quizId/submit', (req: Request, res: Response) => {
  try {
    const quiz = quizzes.get(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ error: '测验不存在' });
    }
    if (!quiz.isOpen) {
      return res.status(403).json({ error: '测验已关闭提交' });
    }

    const { studentName, answers } = req.body as {
      studentName: string;
      answers: StudentAnswer[];
    };

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: '学生姓名不能为空' });
    }

    const submission: Submission = {
      id: uuidv4(),
      quizId: quiz.id,
      studentName: studentName.trim().slice(0, 10),
      answers,
      submittedAt: Date.now()
    };

    const quizSubmissions = submissions.get(quiz.id) || [];
    quizSubmissions.push(submission);
    submissions.set(quiz.id, quizSubmissions);

    const results: QuestionResult[] = gradeSubmission(quiz.questions, answers);
    const correctCount = results.filter((r) => r.isCorrect).length;

    res.json({
      submissionId: submission.id,
      results,
      score: correctCount,
      total: quiz.questions.length
    });
  } catch (err) {
    console.error('提交失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/quizzes/:quizId/stats', (req: Request, res: Response) => {
  const quiz = quizzes.get(req.params.quizId);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }

  const quizSubmissions = submissions.get(quiz.id) || [];
  const totalQuestions = quiz.questions.length;

  const questionStats = quiz.questions.map((q, idx) => {
    const correctCount = quizSubmissions.filter((sub) => {
      const results = gradeSubmission(quiz.questions, sub.answers);
      const result = results.find((r) => r.questionId === q.id);
      return result?.isCorrect;
    }).length;

    const rate = quizSubmissions.length > 0
      ? Math.round((correctCount / quizSubmissions.length) * 100)
      : 0;

    return {
      questionIndex: idx + 1,
      questionId: q.id,
      correctCount,
      totalSubmissions: quizSubmissions.length,
      correctRate: rate
    };
  });

  res.json({
    quizId: quiz.id,
    title: quiz.title,
    isOpen: quiz.isOpen,
    submittedCount: quizSubmissions.length,
    totalQuestions,
    questionStats,
    submissions: quizSubmissions.map((s) => ({
      id: s.id,
      studentName: s.studentName,
      submittedAt: s.submittedAt,
      score: gradeSubmission(quiz.questions, s.answers).filter((r) => r.isCorrect).length
    }))
  });
});

app.put('/api/quizzes/:quizId/toggle', (req: Request, res: Response) => {
  const quiz = quizzes.get(req.params.quizId);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }
  quiz.isOpen = !quiz.isOpen;
  res.json({ quizId: quiz.id, isOpen: quiz.isOpen });
});

app.listen(PORT, () => {
  console.log(`测验服务器运行在 http://localhost:${PORT}`);
});
