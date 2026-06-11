import { v4 as uuidv4 } from 'uuid';
import { Idea, Participant, ActivityMessage, VoteRecord, WorkshopState, Category, ScoreHistoryPoint } from '../types';

const categories: Category[] = ['design', 'tech', 'operation'];

const ideaTitles = [
  { title: '智能个性化推荐系统', category: 'tech' as Category, desc: '基于用户行为和偏好的AI推荐引擎，提升用户留存率30%' },
  { title: '品牌视觉升级计划', category: 'design' as Category, desc: '全新品牌识别系统，包含Logo、配色和应用规范' },
  { title: '用户增长裂变活动', category: 'operation' as Category, desc: '邀请好友得奖励，实现用户指数级增长' },
  { title: '移动端交互重构', category: 'design' as Category, desc: '优化核心流程用户体验，降低操作复杂度' },
  { title: '微服务架构迁移', category: 'tech' as Category, desc: '从单体应用迁移到微服务，提升系统可扩展性' },
  { title: '内容营销矩阵建设', category: 'operation' as Category, desc: '多平台内容分发策略，建立品牌影响力' },
  { title: '实时数据可视化大屏', category: 'tech' as Category, desc: '业务核心指标实时监控，辅助决策' },
  { title: '无障碍设计优化', category: 'design' as Category, desc: '符合WCAG标准，让更多用户受益' },
];

const participantNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六', '蒋十七', '沈十八', '韩十九', '杨二十', '朱二十一', '秦二十二'];

const imagePrompts = [
  'modern%20technology%20abstract%20gradient%20purple%20blue',
  'creative%20design%20workspace%20colorful%20pencils',
  'business%20growth%20chart%20upward%20trend',
  'mobile%20app%20ui%20design%20mockup',
  'cloud%20computing%20server%20infrastructure',
  'social%20media%20marketing%20icons',
  'data%20analytics%20dashboard%20visualization',
  'accessibility%20inclusive%20design%20icon',
];

export const generateMockIdeas = (): Idea[] => {
  return ideaTitles.map((item, index) => ({
    id: uuidv4(),
    title: item.title,
    description: item.desc,
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${imagePrompts[index]}&image_size=square`,
    category: item.category,
  }));
};

export const generateMockParticipants = (): Participant[] => {
  return participantNames.slice(0, 15).map((name, index) => ({
    id: uuidv4(),
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    hasVoted: index < 8,
  }));
};

export const generateMockActivityMessages = (participants: Participant[]): ActivityMessage[] => {
  const messages: ActivityMessage[] = [];
  const now = new Date();

  messages.push({
    id: uuidv4(),
    type: 'system',
    content: '工作坊投票已开始，请大家踊跃参与！',
    timestamp: new Date(now.getTime() - 3600000),
    userName: '系统',
  });

  participants.slice(0, 8).forEach((p, index) => {
    messages.push({
      id: uuidv4(),
      type: 'join',
      content: `加入了工作坊`,
      timestamp: new Date(now.getTime() - 3000000 + index * 60000),
      userName: p.name,
    });

    if (p.hasVoted) {
      messages.push({
        id: uuidv4(),
        type: 'vote',
        content: `完成了投票`,
        timestamp: new Date(now.getTime() - 2000000 + index * 60000),
        userName: p.name,
      });
    }
  });

  return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const generateMockVotes = (ideas: Idea[], participants: Participant[]): VoteRecord[] => {
  const votes: VoteRecord[] = [];
  const now = new Date();

  participants.slice(0, 8).forEach((p, pIndex) => {
    let remaining = 20;
    const shuffledIdeas = [...ideas].sort(() => Math.random() - 0.5);

    shuffledIdeas.forEach((idea, iIndex) => {
      const isLast = iIndex === shuffledIdeas.length - 1;
      const maxPoints = isLast ? remaining : Math.floor(Math.random() * Math.min(5, remaining - (shuffledIdeas.length - iIndex - 1))) + 1;
      const points = isLast ? remaining : Math.max(1, maxPoints);
      remaining -= points;

      votes.push({
        ideaId: idea.id,
        points,
        timestamp: new Date(now.getTime() - 1800000 + pIndex * 30000 + iIndex * 1000),
        participantId: p.id,
      });
    });
  });

  return votes;
};

export const generateInitialScoreHistory = (ideas: Idea[]): ScoreHistoryPoint[] => {
  const history: ScoreHistoryPoint[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const time = new Date(now.getTime() - (5 - i) * 5000);
    const point: ScoreHistoryPoint = {
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    ideas.forEach((idea) => {
      point[idea.id] = Math.floor(Math.random() * 40) + 10;
    });

    history.push(point);
  }

  return history;
};

export const generateInitialState = (): WorkshopState => {
  const ideas = generateMockIdeas();
  const participants = generateMockParticipants();
  const activityMessages = generateMockActivityMessages(participants);
  const votes = generateMockVotes(ideas, participants);
  const scoreHistory = generateInitialScoreHistory(ideas);
  const currentUser = participants[participants.length - 1];

  const voteAllocations = ideas.map((idea) => ({
    ideaId: idea.id,
    points: 0,
  }));

  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 3);

  return {
    eventId: uuidv4(),
    eventTitle: 'Q3产品创新工作坊',
    eventDescription: '从众多创意中筛选出下季度重点投入的产品方向',
    ideas,
    participants,
    votes,
    activityMessages,
    voteAllocations,
    isVotingLocked: false,
    showFinalResults: false,
    viewMode: 'voting',
    sortMode: 'score',
    deadline,
    currentUserId: currentUser.id,
    scoreHistory,
  };
};
