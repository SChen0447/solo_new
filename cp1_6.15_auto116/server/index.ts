import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Artwork, Message, UserPosition, User } from '../src/types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const artworks: Artwork[] = [
  {
    id: 'art-1',
    title: '晨曦之韵',
    author: '林雨萱',
    year: 2023,
    description: '这幅作品描绘了清晨第一缕阳光穿透薄雾的瞬间，温暖的珊瑚红色与柔和的玫瑰色相融合，象征着希望与新生。',
    colors: ['#ff6b6b', '#c06c84'],
    position: { x: -4, y: 2, z: -3.9 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'art-2',
    title: '深海幻境',
    author: '陈墨白',
    year: 2022,
    description: '灵感来源于深海中的神秘世界，青绿色调的渐变如同海水的层次，带领观者进入宁静而深邃的想象空间。',
    colors: ['#4ecdc4', '#1a535c'],
    position: { x: 0, y: 2, z: -3.9 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'art-3',
    title: '金色年华',
    author: '苏晓晴',
    year: 2024,
    description: '明亮的黄色与温暖的橙色交织，如同午后阳光洒在金色麦田上，充满了生命力和对美好时光的追忆。',
    colors: ['#ffe66d', '#f7a440'],
    position: { x: 4, y: 2, z: -3.9 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'art-4',
    title: '薰衣草田',
    author: '王艺琳',
    year: 2023,
    description: '紫色的梦幻渐变，仿佛漫步在普罗旺斯的薰衣草田中，空气中弥漫着淡淡的花香，让人心旷神怡。',
    colors: ['#a855f7', '#6366f1'],
    position: { x: -4, y: 2, z: 3.9 },
    rotation: { x: 0, y: Math.PI, z: 0 },
  },
  {
    id: 'art-5',
    title: '森林低语',
    author: '张青山',
    year: 2022,
    description: '翠绿色的渐变如同森林深处的苔藓与蕨类，充满了自然的气息，仿佛能听到树叶沙沙作响的声音。',
    colors: ['#22c55e', '#15803d'],
    position: { x: 0, y: 2, z: 3.9 },
    rotation: { x: 0, y: Math.PI, z: 0 },
  },
  {
    id: 'art-6',
    title: '暮色温柔',
    author: '李婉清',
    year: 2024,
    description: '粉紫色的渐变如同黄昏时分的天空，温柔而浪漫，是白天与黑夜交替时最美的瞬间。',
    colors: ['#f472b6', '#a78bfa'],
    position: { x: 4, y: 2, z: 3.9 },
    rotation: { x: 0, y: Math.PI, z: 0 },
  },
];

const nicknames = [
  '星空旅人', '画笔匠', '色彩猎人', '光影诗人', '梦境编织者',
  '画廊漫步者', '艺术学徒', '灵感捕手', '时光收藏家', '风景观察员',
];

const avatarColors = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#22c55e',
  '#f472b6', '#3b82f6', '#f97316', '#6366f1', '#14b8a6',
];

let messages: Message[] = [
  {
    id: uuidv4(),
    userId: 'system',
    userName: '系统',
    avatarColor: '#4ecdc4',
    content: '欢迎来到虚拟画廊！点击画作可以查看详情，也可以在右侧留言与其他参观者交流。',
    timestamp: Date.now(),
  },
];

const connectedUsers = new Map<string, User>();

app.get('/api/artworks', (_req, res) => {
  res.json(artworks);
});

app.get('/api/messages', (_req, res) => {
  res.json(messages.slice(-30));
});

io.on('connection', (socket) => {
  const randomNickname = nicknames[Math.floor(Math.random() * nicknames.length)];
  const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  const userId = uuidv4();

  const user: User = {
    id: userId,
    name: randomNickname,
    avatarColor: randomColor,
    position: { x: 0, y: 0.5, z: 0 },
  };

  connectedUsers.set(socket.id, user);

  socket.emit('user_joined', { user, onlineCount: connectedUsers.size });

  socket.broadcast.emit('user_connected', {
    user,
    onlineCount: connectedUsers.size,
  });

  const usersList = Array.from(connectedUsers.values());
  socket.emit('users_list', usersList);

  socket.on('send_message', (data: { content: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !data.content.trim()) return;

    const message: Message = {
      id: uuidv4(),
      userId: user.id,
      userName: user.name,
      avatarColor: user.avatarColor,
      content: data.content.trim(),
      timestamp: Date.now(),
    };

    messages.push(message);
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    io.emit('new_message', message);
  });

  socket.on('user_moved', (position: UserPosition) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    user.position = position;
    socket.broadcast.emit('user_position_updated', {
      userId: user.id,
      position,
    });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);

    if (user) {
      io.emit('user_disconnected', {
        userId: user.id,
        onlineCount: connectedUsers.size,
      });
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
