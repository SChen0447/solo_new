export type ExerciseType = 'choice' | 'short' | 'code';

export interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ExerciseBase {
  id: string;
  title: string;
  type: ExerciseType;
  content: string;
  score: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  isMultiple: boolean;
  options: ChoiceOption[];
  explanation: string;
  referenceAnswer: string;
}

export interface ShortExercise extends ExerciseBase {
  type: 'short';
  referenceAnswer: string;
}

export interface CodeExercise extends ExerciseBase {
  type: 'code';
  referenceSolution: string;
  language: string;
}

export type Exercise = ChoiceExercise | ShortExercise | CodeExercise;

export type MasteryLevel = 'familiar' | 'normal' | 'unfamiliar';

export interface AttemptRecord {
  id: string;
  exerciseId: string;
  type: ExerciseType;
  submittedAt: number;
  score: number;
  maxScore: number;
  isCorrect?: boolean;
  selfScore?: number;
  masteryLevel?: MasteryLevel;
  userAnswer: unknown;
}

export interface ChoiceAnswer {
  selectedOptionIds: string[];
}

export interface ShortAnswer {
  text: string;
}

export interface CodeAnswer {
  code: string;
}

export type UserAnswer = ChoiceAnswer | ShortAnswer | CodeAnswer;

export interface GradingResult {
  score: number;
  maxScore: number;
  isCorrect?: boolean;
  explanation?: string;
  referenceAnswer?: string;
  needsSelfRating?: boolean;
  needsMasteryCheck?: boolean;
}

export interface DailyHeatmapItem {
  date: string;
  count: number;
}

export interface TypeAverageScore {
  type: ExerciseType;
  averageScore: number;
  totalAttempts: number;
}

export interface Statistics {
  totalExercises: number;
  totalAttempts: number;
  overallAccuracy: number;
  dailyHeatmap: DailyHeatmapItem[];
  typeAverages: TypeAverageScore[];
}
