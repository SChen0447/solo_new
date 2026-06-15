export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  avatarColor: string;
  votedVoteIds: string[];
  joinedAt: number;
}

export interface Option {
  id: string;
  text: string;
  voteCount: number;
}

export interface VoteRecord {
  participantId: string;
  participantName?: string;
  optionIds: string[];
  votedAt: number;
}

export interface Vote {
  id: string;
  title: string;
  options: Option[];
  status: 'active' | 'ended';
  isAnonymous: boolean;
  voteType: 'single' | 'multiple';
  maxSelections: number;
  createdAt: number;
  endedAt?: number;
  voteRecords: VoteRecord[];
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  participants: Participant[];
  votes: Vote[];
  currentVoteId?: string;
  createdAt: number;
}

export interface AppState {
  currentUser: Participant | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

export type Action =
  | { type: 'JOIN_SESSION_START' }
  | { type: 'JOIN_SESSION_SUCCESS'; payload: { session: Session; user: Participant } }
  | { type: 'JOIN_SESSION_ERROR'; payload: string }
  | { type: 'CREATE_VOTE'; payload: Vote }
  | { type: 'UPDATE_VOTE'; payload: Vote }
  | { type: 'END_VOTE'; payload: string }
  | { type: 'REACTIVATE_VOTE'; payload: string }
  | { type: 'CAST_VOTE'; payload: { voteId: string; optionIds: string[]; participantId: string } }
  | { type: 'ADD_PARTICIPANT'; payload: Participant }
  | { type: 'SET_CURRENT_VOTE'; payload: string };

export interface CreateVoteParams {
  title: string;
  options: string[];
  isAnonymous: boolean;
  voteType: 'single' | 'multiple';
  maxSelections: number;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface ExportData {
  title: string;
  options: { text: string; voteCount: number; percentage: number }[];
  totalVotes: number;
  timestamp: number;
}
