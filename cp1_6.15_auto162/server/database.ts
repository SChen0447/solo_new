import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      cover_url TEXT,
      media_url TEXT,
      lyrics TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL,
      parent_id TEXT,
      nickname TEXT NOT NULL DEFAULT '匿名听众',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_works_title ON works(title);
    CREATE INDEX IF NOT EXISTS idx_works_artist ON works(artist);
    CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
    CREATE INDEX IF NOT EXISTS idx_comments_work_id ON comments(work_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
  `);

  const workCount = db.prepare('SELECT COUNT(*) as count FROM works').get() as { count: number };
  if (workCount.count === 0) {
    seedData();
  }
}

function seedData() {
  const insertWork = db.prepare(`
    INSERT INTO works (id, title, artist, cover_url, media_url, lyrics)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sampleWorks = [
    {
      id: 'w1',
      title: '夜空遐想',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music1/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      lyrics: `[00:00.00] 夜空遐想
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 星星在天上眨眼
[00:20.00] 月光洒落在窗前
[00:25.00] 我独自坐在夜晚
[00:30.00] 想着远方的你
[00:35.00] 
[00:40.00] 风轻轻吹过脸庞
[00:45.00] 带着思念的味道
[00:50.00] 你是否也在仰望
[00:55.00] 同一片星空
[01:00.00] 
[01:05.00] 让我们的梦想
[01:10.00] 随着音符飘荡
[01:15.00] 穿越时空的距离
[01:20.00] 到达你身旁
[01:25.00] 
[01:30.00] 夜空中最亮的星
[01:35.00] 请指引我方向
[01:40.00] 不管路有多漫长
[01:45.00] 我都不会迷茫`
    },
    {
      id: 'w2',
      title: '城市漫步者',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music2/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      lyrics: `[00:00.00] 城市漫步者
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 走在熟悉的街道
[00:20.00] 霓虹灯闪烁照耀
[00:25.00] 人来人往的街角
[00:30.00] 故事在不断上演
[00:35.00] 
[00:40.00] 咖啡店里的香味
[00:45.00] 勾起了谁的回忆
[00:50.00] 时钟滴答在转动
[00:55.00] 带走了多少时光`
    },
    {
      id: 'w3',
      title: '海边的风',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music3/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      lyrics: `[00:00.00] 海边的风
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 海风吹拂着脸庞
[00:20.00] 浪花拍打着沙滩
[00:25.00] 海鸥在自由飞翔
[00:30.00] 心情如此的宽广
[00:35.00] 
[00:40.00] 放下所有的烦恼
[00:45.00] 感受大海的拥抱
[00:50.00] 让心随着潮水
[00:55.00] 一起自由飘荡`
    },
    {
      id: 'w4',
      title: '秋日私语',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music4/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      lyrics: `[00:00.00] 秋日私语
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 落叶飘落在窗前
[00:20.00] 秋意渐渐浓了
[00:25.00] 你的笑容在眼前
[00:30.00] 温暖着我的心`
    },
    {
      id: 'w5',
      title: '追梦人',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music5/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      lyrics: `[00:00.00] 追梦人
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 我们都是追梦人
[00:20.00] 奔跑在人生路上
[00:25.00] 哪怕风雨再大
[00:30.00] 也要勇敢向前闯`
    },
    {
      id: 'w6',
      title: '月光下的约定',
      artist: '林夕',
      cover_url: 'https://picsum.photos/seed/music6/400/400',
      media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      lyrics: `[00:00.00] 月光下的约定
[00:05.00] 词曲：林夕
[00:10.00] 
[00:15.00] 月光下我们许下诺言
[00:20.00] 一辈子都要在一起
[00:25.00] 不管世界如何改变
[00:30.00] 我们的爱永不褪色`
    }
  ];

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, title, date, time, location, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const sampleSchedules = [
    {
      id: 's1',
      title: '星空音乐节',
      date: formatDate(addDays(today, 3)),
      time: '19:30',
      location: '上海世博公园',
      notes: '准备新歌《夜空遐想》首唱'
    },
    {
      id: 's2',
      title: '城市民谣夜',
      date: formatDate(addDays(today, 7)),
      time: '20:00',
      location: '北京愚公移山酒吧',
      notes: '不插电演出'
    },
    {
      id: 's3',
      title: '海边音乐节',
      date: formatDate(addDays(today, 14)),
      time: '18:00',
      location: '青岛金沙滩',
      notes: '全天音乐节，下午3点彩排'
    },
    {
      id: 's4',
      title: '校园巡演',
      date: formatDate(addDays(today, 21)),
      time: '19:00',
      location: '浙江大学紫金港校区',
      notes: '与学生互动环节'
    }
  ];

  const insertComment = db.prepare(`
    INSERT INTO comments (id, work_id, parent_id, nickname, content)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sampleComments = [
    { id: 'c1', work_id: 'w1', parent_id: null, nickname: '音乐爱好者', content: '太好听了！歌词写得真美，旋律也很动人。' },
    { id: 'c2', work_id: 'w1', parent_id: 'c1', nickname: '林夕', content: '谢谢你的喜欢！这首歌是在一个星光灿烂的夜晚写的。' },
    { id: 'c3', work_id: 'w1', parent_id: null, nickname: '夜猫子', content: '深夜循环播放，特别有感觉。' },
    { id: 'c4', work_id: 'w2', parent_id: null, nickname: '城市旅人', content: '在城市里漂泊的人都能听懂这首歌。' },
    { id: 'c5', work_id: 'w3', parent_id: null, nickname: '海风', content: '听着这首歌，仿佛闻到了大海的味道。' },
  ];

  const transaction = db.transaction(() => {
    for (const work of sampleWorks) {
      insertWork.run(work.id, work.title, work.artist, work.cover_url, work.media_url, work.lyrics);
    }
    for (const schedule of sampleSchedules) {
      insertSchedule.run(schedule.id, schedule.title, schedule.date, schedule.time, schedule.location, schedule.notes);
    }
    for (const comment of sampleComments) {
      insertComment.run(comment.id, comment.work_id, comment.parent_id, comment.nickname, comment.content);
    }
  });

  transaction();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default db;
