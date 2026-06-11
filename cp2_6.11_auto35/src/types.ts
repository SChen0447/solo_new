export type QuestionType = 'radio' | 'checkbox' | 'rating' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: number;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
}

export interface Response {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: number;
}

export interface QuestionStats {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  totalAnswers: number;
  data?: { name: string; value: number; percentage?: number }[];
  textAnswers?: string[];
}

export interface SurveyStats {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  questionStats: QuestionStats[];
}
