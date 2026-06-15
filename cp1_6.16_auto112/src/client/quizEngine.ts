export type QuestionType = 'single' | 'multiple' | 'fill';

export interface Option {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  description: string;
  options?: Option[];
  correctAnswer: string | string[];
  explanation: string;
}

export interface Quiz {
  id: string;
  inviteCode: string;
  title: string;
  questions: Question[];
  isOpen: boolean;
  createdAt: number;
}

export interface StudentAnswer {
  questionId: string;
  answer: string | string[];
}

export interface Submission {
  id: string;
  quizId: string;
  studentName: string;
  answers: StudentAnswer[];
  submittedAt: number;
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  explanation: string;
}

export function compareAnswer(
  question: Question,
  userAnswer: string | string[]
): boolean {
  if (question.type === 'fill') {
    const correct = (question.correctAnswer as string).trim().toLowerCase();
    const user = (userAnswer as string).trim().toLowerCase();
    return correct === user;
  }

  if (question.type === 'single') {
    return question.correctAnswer === userAnswer;
  }

  if (question.type === 'multiple') {
    const correctArr = Array.isArray(question.correctAnswer)
      ? [...question.correctAnswer].sort()
      : [question.correctAnswer as string];
    const userArr = Array.isArray(userAnswer)
      ? [...userAnswer].sort()
      : [userAnswer as string];

    if (correctArr.length !== userArr.length) return false;
    return correctArr.every((val, idx) => val === userArr[idx]);
  }

  return false;
}

export function getExplanation(question: Question): string {
  return question.explanation || '暂无解析';
}

export function gradeSubmission(
  questions: Question[],
  answers: StudentAnswer[]
): QuestionResult[] {
  return questions.map((q) => {
    const ans = answers.find((a) => a.questionId === q.id);
    const userAnswer = ans ? ans.answer : q.type === 'multiple' ? [] : '';
    return {
      questionId: q.id,
      isCorrect: compareAnswer(q, userAnswer),
      userAnswer,
      correctAnswer: q.correctAnswer,
      explanation: getExplanation(q)
    };
  });
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
