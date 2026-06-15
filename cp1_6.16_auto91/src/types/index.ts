export interface Comment {
  id: string;
  content: string;
  timestamp: number;
  authorColor: string;
  animalIcon?: string;
  likes: number;
}

export interface CopyItem {
  id: string;
  content: string;
  style: string;
  styleLabel: string;
  comments: Comment[];
  votes: number;
}

export interface RankingItem {
  copyId: string;
  content: string;
  votes: number;
  percentage: number;
}

export interface DebateSession {
  id: string;
  productName: string;
  targetAudience: string;
  keySellingPoints: string;
  copies: CopyItem[];
  round: number;
  topCopiesForRound2: string[];
  votes: Record<string, number>;
  createdAt: number;
  completedAt?: number;
  finalRankings: RankingItem[];
}

export interface GenerateParams {
  productName: string;
  targetAudience: string;
  keySellingPoints: string;
}

export interface GenerateResponse {
  sessionId: string;
  copies: CopyItem[];
}

export interface CommentParams {
  sessionId: string;
  copyId: string;
  content: string;
}

export interface CommentResponse {
  comment: Comment;
}

export interface LikeParams {
  sessionId: string;
  copyId: string;
  commentId: string;
}

export interface LikeResponse {
  likes: number;
}

export interface VoteParams {
  sessionId: string;
  copyId: string;
}

export interface VoteResponse {
  success: boolean;
}

export interface Round2Response {
  topCopies: CopyItem[];
}

export interface FinishResponse {
  rankings: RankingItem[];
}

export interface HistoryResponse {
  sessions: DebateSession[];
}

export interface HistoryDetailResponse {
  session: DebateSession;
}
