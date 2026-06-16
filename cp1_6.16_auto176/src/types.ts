export type QuestionCategory = 'science' | 'history' | 'literature' | 'geography' | 'entertainment';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerAnswer {
  questionId: string;
  isCorrect: boolean;
  submittedAt: number;
  rank: number;
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isCreator: boolean;
  answers: PlayerAnswer[];
}

export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Room {
  code: string;
  name: string;
  creatorId: string;
  questionCount: number;
  timeLimit: number;
  status: RoomStatus;
  currentQuestionIndex: number;
  questions: Question[];
  players: Player[];
  createdAt: number;
  questionStartTime: number | null;
}

export interface RoomListItem {
  code: string;
  name: string;
  playerCount: number;
  status: RoomStatus;
  creatorNickname: string;
}

export interface CreateRoomRequest {
  roomName: string;
  nickname: string;
  questionCount: number;
  timeLimit: number;
}

export interface CreateRoomResponse {
  room: Room;
  playerId: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  nickname: string;
}

export interface JoinRoomResponse {
  room: Room;
  playerId: string;
}

export interface SubmitAnswerRequest {
  roomCode: string;
  playerId: string;
  questionId: string;
  selectedOption: number;
}

export interface SubmitAnswerResponse {
  success: boolean;
  scoreEarned: number;
  isCorrect: boolean;
  rank: number;
}

export interface RoomStateResponse {
  room: Room;
  timeRemaining: number;
}

export const categoryColors: Record<QuestionCategory, string> = {
  science: '#E3F2FD',
  history: '#FFF3E0',
  literature: '#F3E5F5',
  geography: '#E8F5E9',
  entertainment: '#FFEBEE'
};

export const categoryNames: Record<QuestionCategory, string> = {
  science: '科学',
  history: '历史',
  literature: '文学',
  geography: '地理',
  entertainment: '娱乐'
};

export const medalColors = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32'
};
