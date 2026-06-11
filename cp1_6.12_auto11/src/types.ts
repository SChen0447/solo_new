export type QuestionType = 'single' | 'multiple' | 'dropdown' | 'text' | 'rating';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options?: string[];
  required: boolean;
  order: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: number;
}

export interface Answer {
  id: string;
  surveyId: string;
  questionId: string;
  value: string | string[] | number;
  submittedAt: number;
}

export interface AnswerSubmission {
  surveyId: string;
  answers: { questionId: string; value: any }[];
}

export interface QuestionTypeOption {
  value: QuestionType;
  label: string;
  icon: string;
}

export const QUESTION_TYPES: QuestionTypeOption[] = [
  { value: 'single', label: '单选题', icon: 'circle-dot' },
  { value: 'multiple', label: '多选题', icon: 'check-square' },
  { value: 'dropdown', label: '下拉选择', icon: 'chevron-down' },
  { value: 'text', label: '文本输入', icon: 'type' },
  { value: 'rating', label: '评分题', icon: 'star' },
];
