export interface User {
  id: string;
  username: string;
  avatar?: string;
  tags: string[];
  isActive: boolean;
}

export interface Idea {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: number;
  matchCount: number;
  teamCount: number;
}

export interface MatchResult {
  userId: string;
  username: string;
  avatar?: string;
  tags: string[];
  similarity: number;
  ideaId: string;
}

export interface Team {
  id: string;
  members: User[];
  ideaId: string;
  ideaTitle?: string;
  createdAt: number;
  messages: ChatMessage[];
  todos: TodoItem[];
  notes: string;
  projectPlan: ProjectPlan;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'emoji' | 'image';
  timestamp: number;
}

export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  order: number;
}

export interface ProjectPlan {
  name: string;
  goal: string;
  outcomes: string;
  timeline: string;
  lastEditorId?: string;
  lastUpdated?: number;
}

export interface InviteNotification {
  id: string;
  fromUser: User;
  idea: Idea;
  teamId: string;
  timestamp: number;
}

export const PRESET_TAGS: string[] = [
  'AI', '游戏', '艺术', '教育', '电商', '金融', '社交', '工具',
  '健康', '音乐', '旅行', '美食', '体育', '科学', '环保', '公益',
  '设计', '营销', '运营', '技术'
];

export const TAG_COLORS: Record<string, string> = {
  AI: '#00d2ff',
  游戏: '#ff6b9d',
  艺术: '#c77dff',
  教育: '#ffb84d',
  电商: '#06d6a0',
  金融: '#ef476f',
  社交: '#118ab2',
  工具: '#8338ec',
  健康: '#fb5607',
  音乐: '#ff006e',
  旅行: '#3a86ff',
  美食: '#ffbe0b',
  体育: '#fb5607',
  科学: '#06d6a0',
  环保: '#38b000',
  公益: '#ffafcc',
  设计: '#c77dff',
  营销: '#ff4081',
  运营: '#00a8e8',
  技术: '#7b2cbf'
};

export const GRADIENT_PAIRS: Array<[string, string]> = [
  ['#00d2ff', '#6c63ff'],
  ['#ff6b9d', '#c77dff'],
  ['#ffb84d', '#fb5607'],
  ['#06d6a0', '#118ab2'],
  ['#ef476f', '#ffd166'],
  ['#8338ec', '#3a86ff'],
  ['#ff006e', '#ffbe0b'],
  ['#38b000', '#00a8e8'],
  ['#7b2cbf', '#ff4081'],
  ['#c77dff', '#00d2ff']
];
