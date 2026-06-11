import { v4 as uuidv4 } from 'uuid';
import { Room, Idea, User, VotePayload, SubmitIdeaPayload } from '../shared/types';

const ANIMALS = [
  '猫咪', '狗狗', '熊猫', '兔子', '狐狸', '老虎', '狮子', '大象',
  '猴子', '松鼠', '企鹅', '海豚', '鲸鱼', '猫头鹰', '刺猬', '考拉',
  '树懒', '羊驼', '浣熊', '水獭', '海豹', '袋鼠', '长颈鹿', '斑马'
];

const AVATAR_EMOJIS = [
  '🐱', '🐶', '🐼', '🐰', '🦊', '🐯', '🦁', '🐘',
  '🐵', '🐿️', '🐧', '🐬', '🐋', '🦉', '🦔', '🐨',
  '🦥', '🦙', '🦝', '🦦', '🦭', '🦘', '🦒', '🦓'
];

export function generateRandomUser(): User {
  const idx = Math.floor(Math.random() * ANIMALS.length);
  return {
    id: uuidv4(),
    nickname: `${ANIMALS[idx]}${Math.floor(Math.random() * 1000)}`,
    avatar: AVATAR_EMOJIS[idx]
  };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const room: Room = {
      code,
      ideas: [],
      members: {},
      createdAt: Date.now()
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addMember(roomCode: string, user: User): Room | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    room.members[user.id] = user;
    return room;
  }

  submitIdea(payload: SubmitIdeaPayload, user: User): { idea: Idea; room: Room } | { error: string } {
    const room = this.rooms.get(payload.roomCode);
    if (!room) return { error: '房间不存在' };

    const userIdeas = room.ideas.filter(i => i.authorId === payload.userId).length;
    if (userIdeas >= 3) {
      return { error: '每人最多提交3个想法' };
    }

    const content = payload.content.trim();
    if (!content || content.length > 200) {
      return { error: '想法内容长度需在1-200字之间' };
    }

    const idea: Idea = {
      id: uuidv4(),
      roomCode: payload.roomCode,
      content,
      authorId: payload.userId,
      authorNickname: user.nickname,
      authorAvatar: user.avatar,
      upvotes: 0,
      downvotes: 0,
      voters: {},
      createdAt: Date.now()
    };

    room.ideas.push(idea);
    return { idea, room };
  }

  vote(payload: VotePayload): { idea: Idea; room: Room } | { error: string } {
    const room = this.rooms.get(payload.roomCode);
    if (!room) return { error: '房间不存在' };

    const idea = room.ideas.find(i => i.id === payload.ideaId);
    if (!idea) return { error: '想法不存在' };

    const existingVote = idea.voters[payload.userId];
    if (existingVote === payload.voteType) {
      return { idea, room };
    }

    if (existingVote === 'up') idea.upvotes--;
    if (existingVote === 'down') idea.downvotes--;

    if (payload.voteType === 'up') idea.upvotes++;
    else idea.downvotes++;

    idea.voters[payload.userId] = payload.voteType;
    return { idea, room };
  }

  getSortedIdeas(roomCode: string): Idea[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return [...room.ideas].sort((a, b) => {
      const netA = a.upvotes - a.downvotes;
      const netB = b.upvotes - b.downvotes;
      if (netB !== netA) return netB - netA;
      return b.createdAt - a.createdAt;
    });
  }
}

export const roomManager = new RoomManager();
