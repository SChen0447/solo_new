export type Side = 'pro' | 'con';
export type RoomStatus = 'waiting' | 'debating' | 'voting' | 'finished';

export interface Member {
  id: string;
  nickname: string;
  side: Side;
  order: number;
}

export interface Speech {
  id: string;
  memberId: string;
  nickname: string;
  side: Side;
  content: string;
  timestamp: number;
  round: number;
}

export interface Vote {
  voterId: string;
  voterNickname: string;
  sideVote: Side;
  bestSpeakerId: string;
}

export interface Room {
  roomCode: string;
  topic: string;
  sides: {
    pro: string;
    con: string;
  };
  timeLimit: number;
  status: RoomStatus;
  ownerId: string;
  members: Member[];
  speeches: Speech[];
  votes: Vote[];
  currentSpeakerIndex: number;
  totalRounds: number;
  currentRound: number;
  createdAt: number;
  currentSpeaker?: Member;
}
