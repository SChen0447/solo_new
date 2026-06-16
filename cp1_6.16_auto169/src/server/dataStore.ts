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
}

export interface CreateRoomRequest {
  topic: string;
  proName: string;
  conName: string;
  timeLimit: number;
  ownerNickname: string;
}

export interface JoinRoomRequest {
  nickname: string;
}

export interface SpeakRequest {
  memberId: string;
  content: string;
}

export interface VoteRequest {
  voterId: string;
  sideVote: Side;
  bestSpeakerId: string;
}

class DataStore {
  private rooms: Room[] = [];

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(request: CreateRoomRequest): { roomCode: string; ownerId: string } {
    const roomCode = this.generateRoomCode();
    const ownerId = `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: Room = {
      roomCode,
      topic: request.topic,
      sides: {
        pro: request.proName,
        con: request.conName,
      },
      timeLimit: request.timeLimit,
      status: 'waiting',
      ownerId,
      members: [
        {
          id: ownerId,
          nickname: request.ownerNickname,
          side: 'pro',
          order: 1,
        },
      ],
      speeches: [],
      votes: [],
      currentSpeakerIndex: 0,
      totalRounds: 1,
      currentRound: 1,
      createdAt: Date.now(),
    };

    this.rooms.push(room);
    return { roomCode, ownerId };
  }

  getRooms(): Room[] {
    return this.rooms.map((r) => ({ ...r }));
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.find((r) => r.roomCode === roomCode);
  }

  joinRoom(roomCode: string, nickname: string): { memberId: string; side: Side } | null {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'waiting') {
      return null;
    }

    const proCount = room.members.filter((m) => m.side === 'pro').length;
    const conCount = room.members.filter((m) => m.side === 'con').length;

    if (proCount >= 5 && conCount >= 5) {
      return null;
    }

    const side: Side = conCount < proCount ? 'con' : 'pro';
    const sideMembers = room.members.filter((m) => m.side === side);
    const order = sideMembers.length + 1;

    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    room.members.push({
      id: memberId,
      nickname,
      side,
      order,
    });

    return { memberId, side };
  }

  startDebate(roomCode: string, ownerId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.ownerId !== ownerId || room.status !== 'waiting') {
      return false;
    }

    const proCount = room.members.filter((m) => m.side === 'pro').length;
    const conCount = room.members.filter((m) => m.side === 'con').length;

    if (proCount < 1 || conCount < 1) {
      return false;
    }

    room.status = 'debating';
    room.currentSpeakerIndex = 0;
    room.currentRound = 1;
    room.totalRounds = Math.max(proCount, conCount);

    return true;
  }

  getCurrentSpeaker(roomCode: string): Member | undefined {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'debating') {
      return undefined;
    }

    const proMembers = room.members.filter((m) => m.side === 'pro').sort((a, b) => a.order - b.order);
    const conMembers = room.members.filter((m) => m.side === 'con').sort((a, b) => a.order - b.order);

    const totalSpeakers = proMembers.length + conMembers.length;
    if (room.currentSpeakerIndex >= totalSpeakers * room.totalRounds) {
      return undefined;
    }

    const roundIndex = Math.floor(room.currentSpeakerIndex / 2);
    const isPro = room.currentSpeakerIndex % 2 === 0;
    const sideMembers = isPro ? proMembers : conMembers;

    if (roundIndex < sideMembers.length) {
      return sideMembers[roundIndex];
    }

    return undefined;
  }

  addSpeech(roomCode: string, memberId: string, content: string): Speech | null {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'debating') {
      return null;
    }

    const currentSpeaker = this.getCurrentSpeaker(roomCode);
    if (!currentSpeaker || currentSpeaker.id !== memberId) {
      return null;
    }

    const speech: Speech = {
      id: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberId,
      nickname: currentSpeaker.nickname,
      side: currentSpeaker.side,
      content,
      timestamp: Date.now(),
      round: room.currentRound,
    };

    room.speeches.push(speech);
    room.currentSpeakerIndex++;

    const proMembers = room.members.filter((m) => m.side === 'pro');
    const conMembers = room.members.filter((m) => m.side === 'con');
    const totalSpeakers = proMembers.length + conMembers.length;
    const maxSpeeches = totalSpeakers * room.totalRounds;

    if (room.currentSpeakerIndex >= maxSpeeches) {
      room.status = 'voting';
    } else if (room.currentSpeakerIndex % totalSpeakers === 0) {
      room.currentRound++;
    }

    return speech;
  }

  submitVote(roomCode: string, request: VoteRequest): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'voting') {
      return false;
    }

    if (request.bestSpeakerId === request.voterId) {
      return false;
    }

    const existingVote = room.votes.find((v) => v.voterId === request.voterId);
    if (existingVote) {
      return false;
    }

    const voter = room.members.find((m) => m.id === request.voterId);
    const bestSpeaker = room.members.find((m) => m.id === request.bestSpeakerId);
    if (!voter || !bestSpeaker) {
      return false;
    }

    room.votes.push({
      voterId: request.voterId,
      voterNickname: voter.nickname,
      sideVote: request.sideVote,
      bestSpeakerId: request.bestSpeakerId,
    });

    if (room.votes.length === room.members.length) {
      room.status = 'finished';
    }

    return true;
  }

  getRoomFullData(roomCode: string): Room | undefined {
    return this.getRoom(roomCode);
  }
}

export const dataStore = new DataStore();
