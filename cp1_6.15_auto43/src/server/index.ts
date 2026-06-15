import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createTopicsRouter } from './routes/topics';
import { createVotesRouter } from './routes/votes';

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

export const topics: Topic[] = [];
export const ideas: Idea[] = [];
export const votes: Vote[] = [];
export const comments: Comment[] = [];

const ANIMAL_NAMES = [
  '睿智猫头鹰', '勇敢狮子', '灵动狐狸', '温柔海豚', '坚毅雄鹰',
  '活泼松鼠', '沉稳大象', '敏捷猎豹', '聪慧海豚', '优雅天鹅',
  '忠诚牧羊犬', '机敏兔子', '威猛老虎', '活泼海豹', '沉稳乌龟',
  '灵巧猴子', '憨厚熊猫', '优雅火烈鸟', '敏捷蜻蜓', '和平鸽子',
];

export function getRandomAnimalName(): string {
  return ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
}

const seedData = () => {
  const sampleTopics: Omit<Topic, 'id' | 'createdAt'>[] = [
    { title: '新一代产品设计方向', description: '探讨我们下一代产品的核心设计理念，如何平衡创新与用户体验，以及如何在竞争激烈的市场中脱颖而出。', tags: ['产品设计'], participants: 12, status: 'active' },
    { title: 'Q2营销创意提案', description: '为第二季度的营销活动收集创意点子，包括社交媒体策略、线下活动方案和品牌合作机会。', tags: ['营销创意'], participants: 8, status: 'active' },
    { title: '微服务架构升级方案', description: '讨论现有单体架构向微服务架构迁移的技术方案，包括服务拆分策略、数据一致性和部署方案。', tags: ['技术方案'], participants: 15, status: 'active' },
    { title: '远程团队协作工具', description: '寻找提升远程团队协作效率的工具和方法，包括沟通、项目管理和知识共享方面。', tags: ['产品设计', '技术方案'], participants: 6, status: 'active' },
    { title: '品牌形象焕新计划', description: '为即将到来的品牌升级收集创意，涵盖视觉设计、品牌故事和用户触点优化。', tags: ['营销创意', '产品设计'], participants: 10, status: 'ended' },
  ];

  sampleTopics.forEach((t) => {
    topics.push({ ...t, id: uuidv4(), createdAt: new Date().toISOString() });
  });

  const sampleIdeas: { topicIndex: number; content: string; votesFor: number; votesAgainst: number }[] = [
    { topicIndex: 0, content: '采用AI驱动的个性化推荐系统，根据用户行为实时调整界面布局和功能展示，让每个用户都获得量身定制的体验。', votesFor: 8, votesAgainst: 2 },
    { topicIndex: 0, content: '引入游戏化设计元素，通过成就系统和积分机制提升用户参与度和留存率，同时保持产品的专业感。', votesFor: 5, votesAgainst: 3 },
    { topicIndex: 1, content: '策划一系列短视频挑战赛，邀请用户分享使用场景，通过UGC内容扩大品牌影响力。', votesFor: 12, votesAgainst: 1 },
    { topicIndex: 1, content: '与知名KOL合作开展直播带货活动，结合限时优惠券和互动抽奖提升转化率。', votesFor: 6, votesAgainst: 4 },
    { topicIndex: 2, content: '采用领域驱动设计（DDD）进行服务拆分，先从核心业务域开始，逐步迁移周边服务。', votesFor: 10, votesAgainst: 2 },
    { topicIndex: 2, content: '使用事件溯源（Event Sourcing）模式保证数据一致性，配合CQRS实现读写分离。', votesFor: 7, votesAgainst: 5 },
  ];

  sampleIdeas.forEach((idea) => {
    const id = uuidv4();
    const topicId = topics[idea.topicIndex].id;
    ideas.push({
      id,
      topicId,
      content: idea.content,
      createdAt: new Date().toISOString(),
      votesFor: idea.votesFor,
      votesAgainst: idea.votesAgainst,
      voterIds: [],
      comments: [
        {
          id: uuidv4(),
          ideaId: id,
          anonymousName: getRandomAnimalName(),
          content: '这个想法很有潜力，值得深入探讨！',
          createdAt: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          ideaId: id,
          anonymousName: getRandomAnimalName(),
          content: '建议补充更多具体的实施细节。',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });
};

seedData();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/topics', createTopicsRouter({ topics, ideas, votes, comments }));
app.use('/api/votes', createVotesRouter({ ideas, votes, comments }));

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
