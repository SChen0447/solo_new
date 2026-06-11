export type Category = 'design' | 'tech' | 'operation';

export interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: Category;
}

export interface VoteAllocation {
  ideaId: string;
  points: number;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  hasVoted: boolean;
}

export interface ActivityMessage {
  id: string;
  type: 'vote' | 'join' | 'system';
  content: string;
  timestamp: Date;
  userName: string;
}

export interface VoteRecord {
  ideaId: string;
  points: number;
  timestamp: Date;
  participantId: string;
}

export interface ScoreHistoryPoint {
  time: string;
  [ideaId: string]: number | string;
}

export interface IdeaScore {
  ideaId: string;
  totalScore: number;
  category: Category;
}

export type SortMode = 'score' | 'category';

export type ViewMode = 'voting' | 'results' | 'preview';

export interface WorkshopState {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  ideas: Idea[];
  participants: Participant[];
  votes: VoteRecord[];
  activityMessages: ActivityMessage[];
  voteAllocations: VoteAllocation[];
  isVotingLocked: boolean;
  showFinalResults: boolean;
  viewMode: ViewMode;
  sortMode: SortMode;
  deadline: Date;
  currentUserId: string;
  scoreHistory: ScoreHistoryPoint[];
}

export type WorkshopAction =
  | { type: 'SET_VOTE_ALLOCATION'; payload: VoteAllocation }
  | { type: 'SUBMIT_VOTES' }
  | { type: 'LOCK_VOTING' }
  | { type: 'SHOW_FINAL_RESULTS'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_SORT_MODE'; payload: SortMode }
  | { type: 'ADD_ACTIVITY_MESSAGE'; payload: ActivityMessage }
  | { type: 'UPDATE_SCORE_HISTORY'; payload: ScoreHistoryPoint[] }
  | { type: 'SIMULATE_VOTE' };

export const CATEGORY_CONFIGS: Record<Category, CategoryConfig> = {
  design: {
    label: '设计',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.2)',
  },
  tech: {
    label: '技术',
    color: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.2)',
  },
  operation: {
    label: '运营',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
};

export const MAX_POINTS = 20;
export const MIN_POINTS_PER_IDEA = 1;
export const REFRESH_INTERVAL = 5000;
