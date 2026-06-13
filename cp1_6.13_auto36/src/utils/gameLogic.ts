export type Role = '狼人' | '预言家' | '女巫' | '猎人' | '村民';

export interface Player {
  id: string;
  name: string;
  avatar_index: number;
  role?: Role | null;
  is_alive: boolean;
  is_online: boolean;
}

export interface GameState {
  room_id: string;
  game_state: 'waiting' | 'playing' | 'ended';
  day_count: number;
  phase: 'waiting' | 'day' | 'night';
  players: Player[];
  my_role?: Role | null;
  votes_count: number;
  winner?: string;
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  '狼人': '每晚可以杀死一名玩家',
  '预言家': '每晚可以查验一名玩家的身份',
  '女巫': '拥有一瓶解药和一瓶毒药，每局只能用一次',
  '猎人': '死亡时可以开枪带走一名玩家',
  '村民': '没有特殊技能，通过推理找出狼人',
};

export const COLOR_SCHEMES = [
  {
    name: '日落橙',
    primary: '#FF6B6B',
    secondary: '#FFA07A',
    accent: '#FFD93D',
    bg: 'rgba(255, 107, 107, 0.1)',
  },
  {
    name: '薄荷绿',
    primary: '#4ECDC4',
    secondary: '#7FDBDA',
    accent: '#98D8C8',
    bg: 'rgba(78, 205, 196, 0.1)',
  },
  {
    name: '天空蓝',
    primary: '#45B7D1',
    secondary: '#87CEEB',
    accent: '#B0E0E6',
    bg: 'rgba(69, 183, 209, 0.1)',
  },
  {
    name: '梦幻紫',
    primary: '#6C5CE7',
    secondary: '#A29BFE',
    accent: '#DDA0DD',
    bg: 'rgba(108, 92, 231, 0.1)',
  },
  {
    name: '暖阳金',
    primary: '#F9CA24',
    secondary: '#FFEAA7',
    accent: '#FDCB6E',
    bg: 'rgba(249, 202, 36, 0.1)',
  },
];

export const AVATAR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FF8C42',
  '#6C5CE7',
];

export function getRandomColorScheme() {
  const index = Math.floor(Math.random() * COLOR_SCHEMES.length);
  return COLOR_SCHEMES[index];
}

export function assignRoles(playerCount: number): Role[] {
  const roles: Role[] = [];

  if (playerCount >= 4) {
    roles.push('狼人', '狼人');
    roles.push('预言家');
    roles.push('村民');
  }
  if (playerCount >= 5) {
    roles.push('女巫');
  }
  if (playerCount >= 6) {
    roles.push('猎人');
  }
  while (roles.length < playerCount) {
    roles.push('村民');
  }

  return shuffleArray(roles.slice(0, playerCount));
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function checkWinner(players: Player[]): 'wolves_win' | 'villagers_win' | null {
  const aliveWolves = players.filter(p => p.is_alive && p.role === '狼人');
  const aliveVillagers = players.filter(p => p.is_alive && p.role !== '狼人');

  if (aliveWolves.length === 0) {
    return 'villagers_win';
  }
  if (aliveWolves.length >= aliveVillagers.length) {
    return 'wolves_win';
  }

  return null;
}

export function getRoleGradient(role: Role | null | undefined): string {
  const gradients: Record<Role, string> = {
    '狼人': 'linear-gradient(135deg, #8B0000, #FF4500, #DC143C)',
    '预言家': 'linear-gradient(135deg, #4B0082, #9400D3, #DA70D6)',
    '女巫': 'linear-gradient(135deg, #006400, #32CD32, #98FB98)',
    '猎人': 'linear-gradient(135deg, #8B4513, #D2691E, #DEB887)',
    '村民': 'linear-gradient(135deg, #4682B4, #87CEEB, #B0C4DE)',
  };

  if (!role) {
    return 'linear-gradient(135deg, #666, #999, #ccc)';
  }

  return gradients[role] || 'linear-gradient(135deg, #666, #999, #ccc)';
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
