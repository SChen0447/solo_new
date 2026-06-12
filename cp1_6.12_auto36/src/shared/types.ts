export type QuestionType =
  | 'radio'
  | 'checkbox'
  | 'text'
  | 'rating'
  | 'dropdown'
  | 'date';

export interface Option {
  id: string;
  label: string;
}

export interface Condition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: Option[];
  ratingMax?: number;
  placeholder?: string;
  condition?: Condition;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface FormResponse {
  id: string;
  templateId: string;
  answers: Record<string, any>;
  submittedAt: string;
}

export interface QuestionStats {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  data: any;
}

export interface ReportData {
  templateId: string;
  templateTitle: string;
  totalResponses: number;
  stats: QuestionStats[];
}
