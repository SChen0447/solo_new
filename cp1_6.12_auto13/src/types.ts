export interface Question {
  id: string;
  type: 'single' | 'multiple' | 'boolean';
  title: string;
  options: string[];
  correctAnswer: number | number[];
  explanation: string;
}

export interface AnswerRecord {
  questionId: string;
  selectedOptions: number[];
  isCorrect: boolean;
  timestamp: number;
}

export interface QuestionStat {
  questionId: string;
  questionIndex: number;
  questionTitle: string;
  type: string;
  options: string[];
  totalAnswers: number;
  correctCount: number;
  correctRate: number;
  optionDistribution: Record<number, number>;
}

export interface StatsData {
  questionStats: QuestionStat[];
  totalAnswers: number;
  totalCorrect: number;
  overallRate: number;
  correctRateTrend: {
    questionIndex: number;
    questionTitle: string;
    correctRate: number;
  }[];
}

export interface AnswerFeedback {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: number | number[];
}
