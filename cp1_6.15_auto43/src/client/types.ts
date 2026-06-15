export interface Topic {
  id: string;
  title: string;
  description: string;
  tags: string[];
  participants: number;
  status: 'active' | 'ended';
  createdAt: string;
}

export interface Idea {
  id: string;
  topicId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  votesFor: number;
  votesAgainst: number;
  voterIds: string[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  ideaId: string;
  anonymousName: string;
  content: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  ideaId: string;
  type: 'for' | 'against';
  voterId: string;
}

export interface VoteResult {
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  voterCount: number;
}

export type SortType = 'latest' | 'votes';
