import { create } from 'zustand';
import { User, Idea, MatchResult, Team, InviteNotification, PRESET_TAGS } from '@/lib/types';

interface AppState {
  currentUser: User;
  ideas: Idea[];
  matches: MatchResult[];
  currentTeam: Team | null;
  notifications: InviteNotification[];
  toast: { show: boolean; message: string; type: 'success' | 'error' | 'info' } | null;

  setCurrentUser: (user: User) => void;
  addIdea: (idea: Idea) => void;
  setIdeas: (ideas: Idea[]) => void;
  setMatches: (matches: MatchResult[]) => void;
  setCurrentTeam: (team: Team | null) => void;
  updateTeam: (updates: Partial<Team>) => void;
  addNotification: (n: InviteNotification) => void;
  removeNotification: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

const mockUsers: User[] = [
  { id: 'u1', username: '林清风', tags: ['AI', '教育', '技术'], isActive: true },
  { id: 'u2', username: '张雨桐', tags: ['设计', '艺术', '游戏'], isActive: true },
  { id: 'u3', username: '王思远', tags: ['电商', '营销', '运营'], isActive: true },
  { id: 'u4', username: '李婉清', tags: ['音乐', '艺术', '公益'], isActive: true },
  { id: 'u5', username: '陈志明', tags: ['AI', '工具', '科学'], isActive: true },
  { id: 'u6', username: '赵雪灵', tags: ['教育', '游戏', '旅行'], isActive: true },
  { id: 'u7', username: '孙浩然', tags: ['金融', '技术', '运营'], isActive: true },
  { id: 'u8', username: '周雅琴', tags: ['健康', '美食', '环保'], isActive: true }
];

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockUsers[0],
  ideas: [
    { id: 'idea1', userId: 'u2', title: 'AI辅助儿童绘画启蒙', description: '利用生成式AI帮助6-12岁儿童释放创意', tags: ['AI', '教育', '艺术'], createdAt: Date.now() - 86400000, matchCount: 12, teamCount: 3 },
    { id: 'idea2', userId: 'u3', title: '小众独立游戏平台', description: '为独立游戏开发者提供发行与玩家社区', tags: ['游戏', '社交', '运营'], createdAt: Date.now() - 72000000, matchCount: 8, teamCount: 2 },
    { id: 'idea3', userId: 'u4', title: '乡村音乐教育公益计划', description: '为偏远地区学校提供在线音乐课程', tags: ['音乐', '教育', '公益'], createdAt: Date.now() - 54000000, matchCount: 15, teamCount: 4 },
    { id: 'idea4', userId: 'u5', title: '智能办公自动化套件', description: 'AI驱动的文档、邮件、日程一站式工具', tags: ['AI', '工具', '技术'], createdAt: Date.now() - 43200000, matchCount: 6, teamCount: 1 },
    { id: 'idea5', userId: 'u6', title: '低碳生活打卡小程序', description: '游戏化机制激励用户践行环保行为', tags: ['环保', '游戏', '社交'], createdAt: Date.now() - 36000000, matchCount: 20, teamCount: 5 },
    { id: 'idea6', userId: 'u7', title: '年轻人智能理财助手', description: '个性化投资建议与消费分析工具', tags: ['金融', 'AI', '工具'], createdAt: Date.now() - 28800000, matchCount: 10, teamCount: 2 },
    { id: 'idea7', userId: 'u8', title: '城市共享菜园计划', description: '连接闲置屋顶与都市种植爱好者', tags: ['环保', '美食', '公益'], createdAt: Date.now() - 21600000, matchCount: 9, teamCount: 2 },
    { id: 'idea8', userId: 'u1', title: 'VR沉浸式旅行体验', description: '足不出户游览全球名胜与文化遗产', tags: ['旅行', 'AI', '游戏'], createdAt: Date.now() - 14400000, matchCount: 14, teamCount: 3 }
  ],
  matches: [],
  currentTeam: null,
  notifications: [],
  toast: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  addIdea: (idea) => set({ ideas: [idea, ...get().ideas] }),
  setIdeas: (ideas) => set({ ideas }),
  setMatches: (matches) => set({ matches }),
  setCurrentTeam: (team) => set({ currentTeam: team }),
  updateTeam: (updates) => {
    const team = get().currentTeam;
    if (team) set({ currentTeam: { ...team, ...updates } });
  },
  addNotification: (n) => set({ notifications: [n, ...get().notifications] }),
  removeNotification: (id) => set({ notifications: get().notifications.filter(x => x.id !== id) }),
  showToast: (message, type = 'success') => {
    set({ toast: { show: true, message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  hideToast: () => set({ toast: null })
}));

export { mockUsers, PRESET_TAGS };
