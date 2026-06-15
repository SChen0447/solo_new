const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const ANIMAL_NAMES = [
  '睿智猫头鹰', '勇敢狮子', '灵动狐狸', '温柔海豚', '坚毅雄鹰',
  '活泼松鼠', '沉稳大象', '敏捷猎豹', '聪慧海豚', '优雅天鹅',
  '忠诚牧羊犬', '机敏兔子', '威猛老虎', '活泼海豹', '沉稳乌龟',
  '灵巧猴子', '憨厚熊猫', '优雅火烈鸟', '敏捷蜻蜓', '和平鸽子',
];

function getRandomAnimalName() {
  return ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
}

const topics = [];
const ideas = [];
const votes = [];
const comments = [];

function seedData() {
  const sampleTopics = [
    { title: '新一代产品设计方向', description: '探讨我们下一代产品的核心设计理念，如何平衡创新与用户体验，以及如何在竞争激烈的市场中脱颖而出。', tags: ['产品设计'], participants: 12, status: 'active' },
    { title: 'Q2营销创意提案', description: '为第二季度的营销活动收集创意点子，包括社交媒体策略、线下活动方案和品牌合作机会。', tags: ['营销创意'], participants: 8, status: 'active' },
    { title: '微服务架构升级方案', description: '讨论现有单体架构向微服务架构迁移的技术方案，包括服务拆分策略、数据一致性和部署方案。', tags: ['技术方案'], participants: 15, status: 'active' },
    { title: '远程团队协作工具', description: '寻找提升远程团队协作效率的工具和方法，包括沟通、项目管理和知识共享方面。', tags: ['产品设计', '技术方案'], participants: 6, status: 'active' },
    { title: '品牌形象焕新计划', description: '为即将到来的品牌升级收集创意，涵盖视觉设计、品牌故事和用户触点优化。', tags: ['营销创意', '产品设计'], participants: 10, status: 'ended' },
  ];

  sampleTopics.forEach(t => {
    topics.push({ ...t, id: uuidv4(), createdAt: new Date().toISOString() });
  });

  const sampleIdeas = [
    { topicIndex: 0, content: '采用AI驱动的个性化推荐系统，根据用户行为实时调整界面布局和功能展示，让每个用户都获得量身定制的体验。', votesFor: 8, votesAgainst: 2 },
    { topicIndex: 0, content: '引入游戏化设计元素，通过成就系统和积分机制提升用户参与度和留存率，同时保持产品的专业感。', votesFor: 5, votesAgainst: 3 },
    { topicIndex: 1, content: '策划一系列短视频挑战赛，邀请用户分享使用场景，通过UGC内容扩大品牌影响力。', votesFor: 12, votesAgainst: 1 },
    { topicIndex: 1, content: '与知名KOL合作开展直播带货活动，结合限时优惠券和互动抽奖提升转化率。', votesFor: 6, votesAgainst: 4 },
    { topicIndex: 2, content: '采用领域驱动设计（DDD）进行服务拆分，先从核心业务域开始，逐步迁移周边服务。', votesFor: 10, votesAgainst: 2 },
    { topicIndex: 2, content: '使用事件溯源（Event Sourcing）模式保证数据一致性，配合CQRS实现读写分离。', votesFor: 7, votesAgainst: 5 },
  ];

  sampleIdeas.forEach(idea => {
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
        { id: uuidv4(), ideaId: id, anonymousName: getRandomAnimalName(), content: '这个想法很有潜力，值得深入探讨！', createdAt: new Date().toISOString() },
        { id: uuidv4(), ideaId: id, anonymousName: getRandomAnimalName(), content: '建议补充更多具体的实施细节。', createdAt: new Date().toISOString() },
      ],
    });
  });
}

seedData();

const app = express();
app.use(cors());
app.use(express.json());

// Topics routes
app.get('/api/topics', (req, res) => {
  const { tag, status } = req.query;
  let filtered = [...topics];
  if (tag && typeof tag === 'string') {
    filtered = filtered.filter(t => t.tags.includes(tag));
  }
  if (status && typeof status === 'string') {
    filtered = filtered.filter(t => t.status === status);
  }
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(filtered);
});

app.get('/api/topics/:id', (req, res) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  const topicIdeas = ideas
    .filter(i => i.topicId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ topic, ideas: topicIdeas });
});

app.post('/api/topics', (req, res) => {
  const { title, description, tags } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (title.length > 50) {
    return res.status(400).json({ error: 'Title must be 50 characters or less' });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Description must be 500 characters or less' });
  }
  const topic = {
    id: uuidv4(),
    title: title.trim(),
    description: (description || '').trim(),
    tags: tags || [],
    participants: 1,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  topics.push(topic);
  res.status(201).json(topic);
});

app.post('/api/topics/:id/ideas', (req, res) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  const { content, imageUrl } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }
  if (content.length > 200) {
    return res.status(400).json({ error: 'Content must be 200 characters or less' });
  }
  topic.participants += 1;
  const idea = {
    id: uuidv4(),
    topicId: req.params.id,
    content: content.trim(),
    imageUrl: imageUrl || undefined,
    createdAt: new Date().toISOString(),
    votesFor: 0,
    votesAgainst: 0,
    voterIds: [],
    comments: [],
  };
  ideas.push(idea);
  res.status(201).json(idea);
});

app.get('/api/topics/:id/ideas', (req, res) => {
  const { sort } = req.query;
  let topicIdeas = ideas.filter(i => i.topicId === req.params.id);
  if (sort === 'votes') {
    topicIdeas.sort((a, b) => (b.votesFor - b.votesAgainst) - (a.votesFor - a.votesAgainst));
  } else {
    topicIdeas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  res.json(topicIdeas);
});

app.patch('/api/topics/:id/status', (req, res) => {
  const topic = topics.find(t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  const { status } = req.body;
  if (status !== 'active' && status !== 'ended') {
    return res.status(400).json({ error: 'Invalid status' });
  }
  topic.status = status;
  res.json(topic);
});

// Votes routes
app.post('/api/votes', (req, res) => {
  const { ideaId, type, voterId } = req.body;
  if (!ideaId || !type || !voterId) {
    return res.status(400).json({ error: 'ideaId, type, and voterId are required' });
  }
  if (type !== 'for' && type !== 'against') {
    return res.status(400).json({ error: 'Type must be "for" or "against"' });
  }
  const idea = ideas.find(i => i.id === ideaId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });

  const existingVoteIndex = votes.findIndex(v => v.ideaId === ideaId && v.voterId === voterId);

  if (existingVoteIndex !== -1) {
    const existingVote = votes[existingVoteIndex];
    if (existingVote.type === type) {
      if (existingVote.type === 'for') idea.votesFor--;
      else idea.votesAgainst--;
      idea.voterIds = idea.voterIds.filter(vid => vid !== voterId);
      votes.splice(existingVoteIndex, 1);
      return res.json({ idea, vote: null });
    } else {
      if (existingVote.type === 'for') idea.votesFor--;
      else idea.votesAgainst--;
      if (type === 'for') idea.votesFor++;
      else idea.votesAgainst++;
      votes[existingVoteIndex] = { ...existingVote, type };
      return res.json({ idea, vote: votes[existingVoteIndex] });
    }
  }

  const vote = { id: uuidv4(), ideaId, type, voterId };
  votes.push(vote);
  if (type === 'for') idea.votesFor++;
  else idea.votesAgainst++;
  if (!idea.voterIds.includes(voterId)) {
    idea.voterIds.push(voterId);
  }
  res.status(201).json({ idea, vote });
});

app.get('/api/votes/:ideaId', (req, res) => {
  const ideaVotes = votes.filter(v => v.ideaId === req.params.ideaId);
  const idea = ideas.find(i => i.id === req.params.ideaId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  res.json({
    votesFor: idea.votesFor,
    votesAgainst: idea.votesAgainst,
    totalVotes: idea.votesFor + idea.votesAgainst,
    voterCount: idea.voterIds.length,
    votes: ideaVotes,
  });
});

app.post('/api/votes/:ideaId/comments', (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }
  const idea = ideas.find(i => i.id === req.params.ideaId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  const comment = {
    id: uuidv4(),
    ideaId: req.params.ideaId,
    anonymousName: getRandomAnimalName(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  idea.comments.push(comment);
  comments.push(comment);
  res.status(201).json(comment);
});

app.get('/api/votes/:ideaId/comments', (req, res) => {
  const idea = ideas.find(i => i.id === req.params.ideaId);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  res.json(idea.comments);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
