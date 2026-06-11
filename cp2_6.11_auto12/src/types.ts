export type QuestionType = 'single' | 'multiple' | 'rating';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options: Option[];
}

export interface Survey {
  id: string;
  title: string;
  questions: Question[];
  published: boolean;
}

export interface QuestionResponse {
  questionId: string;
  selectedOptionIds: string[];
  ratingValue?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: QuestionResponse[];
  createdAt: number;
}

export interface WSMessage {
  type: 'new_response' | 'survey_reset' | 'survey_updated';
  payload: SurveyResponse | { surveyId: string } | Survey;
}
