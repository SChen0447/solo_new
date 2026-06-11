import { OKR, Notification, TeamMember } from './types';
import { v4 as uuidv4 } from 'uuid';

export const teamMembers: TeamMember[] = [
  { id: '1', name: '张明', avatar: 'ZM' },
  { id: '2', name: '李华', avatar: 'LH' },
  { id: '3', name: '王芳', avatar: 'WF' },
  { id: '4', name: '赵强', avatar: 'ZQ' },
  { id: '5', name: '陈静', avatar: 'CJ' },
];

export let okrs: OKR[] = [
  {
    id: uuidv4(),
    title: '提升产品用户体验',
    quarter: 'Q1',
    owner: '张明',
    ownerAvatar: 'ZM',
    keyResults: [
      { id: uuidv4(), description: '完成用户调研并输出报告', currentValue: 8, targetValue: 10 },
      { id: uuidv4(), description: '优化核心页面加载速度', currentValue: 60, targetValue: 100 },
      { id: uuidv4(), description: '用户满意度评分提升', currentValue: 4.2, targetValue: 5 },
    ],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: uuidv4(),
    title: '推动技术架构升级',
    quarter: 'Q1',
    owner: '李华',
    ownerAvatar: 'LH',
    keyResults: [
      { id: uuidv4(), description: '完成微服务拆分设计', currentValue: 3, targetValue: 5 },
      { id: uuidv4(), description: '数据库迁移完成', currentValue: 1, targetValue: 2 },
    ],
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: uuidv4(),
    title: '拓展市场份额',
    quarter: 'Q1',
    owner: '王芳',
    ownerAvatar: 'WF',
    keyResults: [
      { id: uuidv4(), description: '新增企业客户数', currentValue: 15, targetValue: 20 },
      { id: uuidv4(), description: '市场活动参与人数', currentValue: 500, targetValue: 800 },
      { id: uuidv4(), description: '品牌曝光量提升', currentValue: 100000, targetValue: 150000 },
    ],
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: uuidv4(),
    title: '优化团队协作效率',
    quarter: 'Q2',
    owner: '赵强',
    ownerAvatar: 'ZQ',
    keyResults: [
      { id: uuidv4(), description: '引入敏捷开发流程', currentValue: 2, targetValue: 4 },
      { id: uuidv4(), description: '团队培训时长', currentValue: 20, targetValue: 40 },
    ],
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: uuidv4(),
    title: '产品功能迭代',
    quarter: 'Q2',
    owner: '陈静',
    ownerAvatar: 'CJ',
    keyResults: [
      { id: uuidv4(), description: '新功能上线数量', currentValue: 3, targetValue: 8 },
      { id: uuidv4(), description: 'Bug修复率', currentValue: 85, targetValue: 95 },
      { id: uuidv4(), description: '用户反馈响应时间', currentValue: 24, targetValue: 12 },
    ],
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: uuidv4(),
    title: '数据驱动决策',
    quarter: 'Q1',
    owner: '张明',
    ownerAvatar: 'ZM',
    keyResults: [
      { id: uuidv4(), description: '数据看板建设', currentValue: 5, targetValue: 10 },
      { id: uuidv4(), description: '数据分析报告输出', currentValue: 2, targetValue: 6 },
    ],
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 4,
  },
];

export let notifications: Notification[] = [
  {
    id: uuidv4(),
    type: 'edit',
    message: '张明更新了OKR"提升产品用户体验"的进度',
    okrId: okrs[0].id,
    okrTitle: '提升产品用户体验',
    timestamp: Date.now() - 3600000,
    read: false,
  },
  {
    id: uuidv4(),
    type: 'progress',
    message: 'OKR"拓展市场份额"进度已超过80%！',
    okrId: okrs[2].id,
    okrTitle: '拓展市场份额',
    timestamp: Date.now() - 7200000,
    read: false,
  },
];

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  const newNotification: Notification = {
    ...notification,
    id: uuidv4(),
    timestamp: Date.now(),
    read: false,
  };
  notifications.unshift(newNotification);
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  return newNotification;
};

export const calculateOKRProgress = (okr: OKR): number => {
  if (okr.keyResults.length === 0) return 0;
  const totalProgress = okr.keyResults.reduce((sum, kr) => {
    const progress = Math.min((kr.currentValue / kr.targetValue) * 100, 100);
    return sum + progress;
  }, 0);
  return Math.round(totalProgress / okr.keyResults.length);
};
