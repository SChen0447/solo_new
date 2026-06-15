export type QuestionType = 'single' | 'multiple' | 'truefalse';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  answer: string | string[];
  score: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  duration: number;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
}

export interface StudentAnswers {
  [questionId: string]: string | string[];
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  className?: string;
  totalScore: number;
  correctRate: number;
  duration: number;
  answers: StudentAnswers;
  scoreByType: {
    single: number;
    multiple: number;
    truefalse: number;
  };
  submittedAt: number;
}

export interface ExamState {
  currentExamId: string | null;
  currentQuestionIndex: number;
  answers: StudentAnswers;
  startTime: number | null;
  isSubmitted: boolean;
  result: ExamResult | null;
}

export type PageType = 'examManage' | 'questionImport' | 'examEngine' | 'scoreBoard';
