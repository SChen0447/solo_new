export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  isMultiple: boolean;
  knowledgeTag: string;
  createdAt: number;
  isActive: boolean;
  correctAnswers: string[];
}

export interface Vote {
  questionId: string;
  studentId: string;
  studentName: string;
  optionIndices: number[];
  timestamp: number;
  isCorrect: boolean;
  responseTime: number;
}

export interface VoteUpdate {
  questionId: string;
  optionVotes: number[];
  optionPercentages: number[];
  totalVotes: number;
  correctRate: number;
  averageResponseTime: number;
  votes: Vote[];
}

export interface AggregatedData {
  students: string[];
  knowledgeTags: string[];
  matrix: (number | null)[][];
  overallStats: {
    tag: string;
    correctRate: number;
    totalQuestions: number;
  }[];
}

export interface HeartbeatPacket {
  id: string;
  timestamp: number;
}

export interface RttMeasurement {
  id: string;
  rtt: number;
  timestamp: number;
  isSlow: boolean;
}

export type UserRole = 'lecturer' | 'student';

export interface AppState {
  role: UserRole | null;
  studentName: string;
  isConnected: boolean;
  rtt: number;
  isLatencyHigh: boolean;
  activeQuestion: Question | null;
  questions: Question[];
  voteUpdates: Record<string, VoteUpdate>;
  aggregatedData: AggregatedData | null;
  submittedQuestions: Set<string>;
}
