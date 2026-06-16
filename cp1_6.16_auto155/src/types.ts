export type QuestionType = 'quiz' | 'vote';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer?: number;
}

export interface Courseware {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

export interface StudentAnswer {
  questionId: string;
  selectedOption: number;
}

export interface QuizResult {
  questionId: string;
  optionCounts: Record<string, number>;
  totalAnswers: number;
}

export interface CoursewareResults {
  coursewareId: string;
  title: string;
  results: QuizResult[];
  totalParticipants: number;
}

export interface AnswerSubmission {
  coursewareId: string;
  answers: StudentAnswer[];
}
