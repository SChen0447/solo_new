import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataFile = join(__dirname, 'data.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const readData = () => {
  if (!fs.existsSync(dataFile)) {
    return { podcasts: [], ideas: [] };
  }
  const raw = fs.readFileSync(dataFile, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

app.get('/api/podcasts', (req, res) => {
  const data = readData();
  res.json(data.podcasts);
});

app.get('/api/podcasts/:id', (req, res) => {
  const data = readData();
  const podcast = data.podcasts.find(p => p.id === req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json(podcast);
});

app.post('/api/podcasts', (req, res) => {
  const data = readData();
  const newPodcast = {
    id: uuidv4(),
    title: req.body.title,
    coverUrl: req.body.coverUrl || '',
    description: req.body.description || '',
    category: req.body.category || '其他',
    episodes: [],
    createdAt: new Date().toISOString()
  };
  data.podcasts.push(newPodcast);
  writeData(data);
  res.status(201).json(newPodcast);
});

app.put('/api/podcasts/:id', (req, res) => {
  const data = readData();
  const index = data.podcasts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Podcast not found' });
  data.podcasts[index] = { ...data.podcasts[index], ...req.body };
  writeData(data);
  res.json(data.podcasts[index]);
});

app.delete('/api/podcasts/:id', (req, res) => {
  const data = readData();
  data.podcasts = data.podcasts.filter(p => p.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/podcasts/:podcastId/episodes', (req, res) => {
  const data = readData();
  const podcast = data.podcasts.find(p => p.id === req.params.podcastId);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json(podcast.episodes || []);
});

app.get('/api/podcasts/:podcastId/episodes/:episodeId', (req, res) => {
  const data = readData();
  const podcast = data.podcasts.find(p => p.id === req.params.podcastId);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  const episode = podcast.episodes.find(e => e.id === req.params.episodeId);
  if (!episode) return res.status(404).json({ error: 'Episode not found' });
  res.json(episode);
});

app.post('/api/podcasts/:podcastId/episodes', (req, res) => {
  const data = readData();
  const podcastIndex = data.podcasts.findIndex(p => p.id === req.params.podcastId);
  if (podcastIndex === -1) return res.status(404).json({ error: 'Podcast not found' });
  const newEpisode = {
    id: uuidv4(),
    title: req.body.title,
    guest: req.body.guest || '',
    duration: req.body.duration || 0,
    publishDate: req.body.publishDate || new Date().toISOString().split('T')[0],
    status: req.body.status || 'draft',
    keywords: req.body.keywords || [],
    createdAt: new Date().toISOString()
  };
  data.podcasts[podcastIndex].episodes.push(newEpisode);
  writeData(data);
  res.status(201).json(newEpisode);
});

app.put('/api/podcasts/:podcastId/episodes/:episodeId', (req, res) => {
  const data = readData();
  const podcastIndex = data.podcasts.findIndex(p => p.id === req.params.podcastId);
  if (podcastIndex === -1) return res.status(404).json({ error: 'Podcast not found' });
  const episodeIndex = data.podcasts[podcastIndex].episodes.findIndex(e => e.id === req.params.episodeId);
  if (episodeIndex === -1) return res.status(404).json({ error: 'Episode not found' });
  data.podcasts[podcastIndex].episodes[episodeIndex] = {
    ...data.podcasts[podcastIndex].episodes[episodeIndex],
    ...req.body
  };
  writeData(data);
  res.json(data.podcasts[podcastIndex].episodes[episodeIndex]);
});

app.delete('/api/podcasts/:podcastId/episodes/:episodeId', (req, res) => {
  const data = readData();
  const podcastIndex = data.podcasts.findIndex(p => p.id === req.params.podcastId);
  if (podcastIndex === -1) return res.status(404).json({ error: 'Podcast not found' });
  data.podcasts[podcastIndex].episodes = data.podcasts[podcastIndex].episodes.filter(
    e => e.id !== req.params.episodeId
  );
  writeData(data);
  res.json({ success: true });
});

app.get('/api/ideas', (req, res) => {
  const data = readData();
  res.json(data.ideas || []);
});

app.post('/api/ideas', (req, res) => {
  const data = readData();
  const newIdea = {
    id: uuidv4(),
    title: req.body.title,
    keywords: req.body.keywords || [],
    description: req.body.description || '',
    createdAt: new Date().toISOString()
  };
  if (!data.ideas) data.ideas = [];
  data.ideas.push(newIdea);
  writeData(data);
  res.status(201).json(newIdea);
});

app.delete('/api/ideas/:id', (req, res) => {
  const data = readData();
  data.ideas = (data.ideas || []).filter(i => i.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const data = readData();
  const podcasts = data.podcasts || [];
  
  let totalEpisodes = 0;
  let totalDuration = 0;
  let publishedEpisodes = 0;
  const categoryCount = {};
  const last30DaysEpisodes = [];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  podcasts.forEach(podcast => {
    if (categoryCount[podcast.category]) {
      categoryCount[podcast.category]++;
    } else {
      categoryCount[podcast.category] = 1;
    }
    
    (podcast.episodes || []).forEach(episode => {
      totalEpisodes++;
      if (episode.status === 'published') {
        publishedEpisodes++;
      }
      totalDuration += episode.duration || 0;
      
      const epDate = new Date(episode.publishDate);
      if (epDate >= thirtyDaysAgo) {
        last30DaysEpisodes.push(episode);
      }
    });
  });
  
  const dailyNew = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    dailyNew[dateStr] = 0;
  }
  
  last30DaysEpisodes.forEach(ep => {
    const dateStr = new Date(ep.publishDate).toISOString().split('T')[0];
    if (dailyNew[dateStr] !== undefined) {
      dailyNew[dateStr]++;
    }
  });
  
  const trendData = Object.entries(dailyNew).map(([date, count]) => ({
    date: date.slice(5),
    count
  }));
  
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
    name,
    value
  }));
  
  res.json({
    totalPodcasts: podcasts.length,
    totalEpisodes,
    publishedEpisodes,
    averageDuration: totalEpisodes > 0 ? Math.round(totalDuration / totalEpisodes) : 0,
    last30DaysNew: last30DaysEpisodes.length,
    trendData,
    categoryData
  });
});

const initSampleData = () => {
  if (!fs.existsSync(dataFile)) {
    const sampleData = {
      podcasts: [
        {
          id: uuidv4(),
          title: '科技前沿',
          coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=300&fit=crop',
          description: '探索最新科技趋势，深度解读AI、区块链、量子计算等前沿技术。',
          category: '科技',
          episodes: [
            {
              id: uuidv4(),
              title: 'GPT-5来了：AI的下一个里程碑',
              guest: '张明博士',
              duration: 58,
              publishDate: '2026-06-01',
              status: 'published',
              keywords: ['AI', 'GPT', '大模型', '自然语言处理', '未来科技']
            },
            {
              id: uuidv4(),
              title: '量子计算的商业化之路',
              guest: '李华教授',
              duration: 45,
              publishDate: '2026-06-08',
              status: 'published',
              keywords: ['量子计算', '科技', '商业化', '未来']
            },
            {
              id: uuidv4(),
              title: '元宇宙的现实与幻想',
              guest: '王芳',
              duration: 52,
              publishDate: '2026-06-12',
              status: 'recording',
              keywords: ['元宇宙', 'VR', 'AR', '虚拟世界']
            }
          ],
          createdAt: '2026-01-15T00:00:00.000Z'
        },
        {
          id: uuidv4(),
          title: '慢生活',
          coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
          description: '在快节奏的都市生活中，寻找属于自己的慢时光。',
          category: '生活',
          episodes: [
            {
              id: uuidv4(),
              title: '极简主义：少即是多',
              guest: '陈静',
              duration: 40,
              publishDate: '2026-05-20',
              status: 'published',
              keywords: ['极简主义', '生活方式', '断舍离']
            },
            {
              id: uuidv4(),
              title: '手冲咖啡的艺术',
              guest: '林小虎',
              duration: 35,
              publishDate: '2026-05-28',
              status: 'published',
              keywords: ['咖啡', '生活', '品味', '手工']
            },
            {
              id: uuidv4(),
              title: '城市中的自然角落',
              guest: '',
              duration: 0,
              publishDate: '2026-06-15',
              status: 'draft',
              keywords: ['自然', '城市', '治愈', '公园']
            }
          ],
          createdAt: '2026-02-10T00:00:00.000Z'
        },
        {
          id: uuidv4(),
          title: '历史回声',
          coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=300&h=300&fit=crop',
          description: '聆听历史的声音，探寻那些被遗忘的故事。',
          category: '历史',
          episodes: [
            {
              id: uuidv4(),
              title: '丝绸之路的兴衰',
              guest: '赵历史',
              duration: 65,
              publishDate: '2026-05-10',
              status: 'published',
              keywords: ['丝绸之路', '历史', '贸易', '文化交流']
            },
            {
              id: uuidv4(),
              title: '敦煌壁画背后的故事',
              guest: '孙研究员',
              duration: 55,
              publishDate: '2026-05-25',
              status: 'published',
              keywords: ['敦煌', '壁画', '艺术', '历史', '文化']
            },
            {
              id: uuidv4(),
              title: '大唐盛世的日常生活',
              guest: '周教授',
              duration: 60,
              publishDate: '2026-06-05',
              status: 'published',
              keywords: ['唐朝', '历史', '生活', '文化']
            }
          ],
          createdAt: '2026-03-01T00:00:00.000Z'
        },
        {
          id: uuidv4(),
          title: '商业洞察',
          coverUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=300&fit=crop',
          description: '深度分析商业趋势，分享创业经验与投资智慧。',
          category: '商业',
          episodes: [
            {
              id: uuidv4(),
              title: 'SaaS创业的黄金时代',
              guest: '刘创业',
              duration: 48,
              publishDate: '2026-05-15',
              status: 'published',
              keywords: ['SaaS', '创业', '商业模式', 'B2B']
            },
            {
              id: uuidv4(),
              title: '消费降级还是消费分级',
              guest: '钱市场',
              duration: 42,
              publishDate: '2026-06-01',
              status: 'published',
              keywords: ['消费', '市场', '经济', '趋势']
            }
          ],
          createdAt: '2026-04-01T00:00:00.000Z'
        },
        {
          id: uuidv4(),
          title: '健康生活家',
          coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
          description: '科学健身，健康饮食，让生活更有品质。',
          category: '健康',
          episodes: [
            {
              id: uuidv4(),
              title: '居家健身完全指南',
              guest: '郑教练',
              duration: 50,
              publishDate: '2026-05-05',
              status: 'published',
              keywords: ['健身', '居家', '运动', '健康']
            },
            {
              id: uuidv4(),
              title: '睡眠质量提升手册',
              guest: '冯医生',
              duration: 38,
              publishDate: '2026-05-18',
              status: 'published',
              keywords: ['睡眠', '健康', '养生', '压力']
            }
          ],
          createdAt: '2026-04-15T00:00:00.000Z'
        }
      ],
      ideas: [
        {
          id: uuidv4(),
          title: 'AI与创意产业的碰撞',
          keywords: ['AI', '创意', '设计', '艺术'],
          description: '探讨AI如何改变创意工作者的工作方式',
          createdAt: '2026-06-10T00:00:00.000Z'
        },
        {
          id: uuidv4(),
          title: '数字游民的生活方式',
          keywords: ['数字游民', '远程工作', '旅行', '自由'],
          description: '一边工作一边旅行的生活是否值得追求',
          createdAt: '2026-06-11T00:00:00.000Z'
        }
      ]
    };
    writeData(sampleData);
  }
};

initSampleData();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
