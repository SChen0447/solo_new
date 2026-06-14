export interface ScoringDimension {
  id: string;
  name: string;
  maxScore: number;
  score: number;
}

export interface Annotation {
  id: string;
  assignmentId: string;
  submissionId: string;
  startIndex: number;
  endIndex: number;
  text: string;
  comment: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
  scores: ScoringDimension[];
  annotations: Annotation[];
  status: 'submitted' | 'graded';
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  scoringDimensions: Omit<ScoringDimension, 'score'>[];
  submissions: Submission[];
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
