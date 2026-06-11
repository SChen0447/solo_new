export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Idea {
  id: string;
  roomCode: string;
  content: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  upvotes: number;
  downvotes: number;
  voters: Record<string, 'up' | 'down'>;
  createdAt: number;
}

export interface Room {
  code: string;
  ideas: Idea[];
  members: Record<string, User>;
  createdAt: number;
}

export interface VotePayload {
  roomCode: string;
  ideaId: string;
  userId: string;
  voteType: 'up' | 'down';
}

export interface SubmitIdeaPayload {
  roomCode: string;
  content: string;
  userId: string;
}

export type WsMessage =
  | { type: 'idea_added'; data: Idea }
  | { type: 'vote_updated'; data: Idea }
  | { type: 'room_state'; data: Room }
  | { type: 'member_joined'; data: User };
