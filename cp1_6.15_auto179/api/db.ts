import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Artwork, Vote, Comment } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'gallery.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      description TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      artworkId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (artworkId) REFERENCES artworks(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      artworkId TEXT NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      avatarColor TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (artworkId) REFERENCES artworks(id)
    );
  `);

  const count = database.prepare('SELECT COUNT(*) as count FROM artworks').get() as { count: number };
  if (count.count === 0) {
    const artworks: Omit<Artwork, 'voteCount'>[] = [
      { id: '1', title: '星夜', artist: '梵高', description: '后印象派代表作品，旋涡般的夜空与宁静的村庄形成强烈对比', imageUrl: 'https://picsum.photos/seed/art1/640/480', category: '后印象派' },
      { id: '2', title: '睡莲', artist: '莫奈', description: '印象派大师对光影与水面的极致追求', imageUrl: 'https://picsum.photos/seed/art2/640/480', category: '印象派' },
      { id: '3', title: '呐喊', artist: '蒙克', description: '表现主义经典，扭曲的人形与血红天空', imageUrl: 'https://picsum.photos/seed/art3/640/480', category: '表现主义' },
      { id: '4', title: '记忆的永恒', artist: '达利', description: '超现实主义代表作，融化的时钟象征时间的主观性', imageUrl: 'https://picsum.photos/seed/art4/640/480', category: '超现实主义' },
      { id: '5', title: '格尔尼卡', artist: '毕加索', description: '立体主义反战巨作，控诉战争的残酷', imageUrl: 'https://picsum.photos/seed/art5/640/480', category: '立体主义' },
      { id: '6', title: '戴珍珠耳环的少女', artist: '维米尔', description: '巴洛克时期经典肖像画，神秘少女的回眸', imageUrl: 'https://picsum.photos/seed/art6/640/480', category: '巴洛克' },
      { id: '7', title: '神奈川冲浪里', artist: '葛饰北斋', description: '浮世绘名作，巨浪与远处富士山的对比', imageUrl: 'https://picsum.photos/seed/art7/640/480', category: '浮世绘' },
      { id: '8', title: '创世纪', artist: '米开朗基罗', description: '文艺复兴壁画，上帝与亚当指尖相触的瞬间', imageUrl: 'https://picsum.photos/seed/art8/640/480', category: '文艺复兴' },
      { id: '9', title: '吻', artist: '克里姆特', description: '新艺术运动金色时期杰作，金色装饰与爱侣', imageUrl: 'https://picsum.photos/seed/art9/640/480', category: '新艺术运动' },
      { id: '10', title: '大碗岛的星期天', artist: '修拉', description: '点彩派开山之作，无数色点构成的午后', imageUrl: 'https://picsum.photos/seed/art10/640/480', category: '点彩派' },
      { id: '11', title: '自由引导人民', artist: '德拉克罗瓦', description: '浪漫主义巨作，自由女神高举三色旗', imageUrl: 'https://picsum.photos/seed/art11/640/480', category: '浪漫主义' },
      { id: '12', title: '维纳斯的诞生', artist: '波提切利', description: '文艺复兴早期神话画作，维纳斯从海中诞生', imageUrl: 'https://picsum.photos/seed/art12/640/480', category: '文艺复兴' },
    ];

    const insertArtwork = database.prepare(
      'INSERT INTO artworks (id, title, artist, description, imageUrl, category) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertVote = database.prepare(
      'INSERT INTO votes (id, artworkId, createdAt) VALUES (?, ?, ?)'
    );

    const transaction = database.transaction(() => {
      for (const artwork of artworks) {
        insertArtwork.run(artwork.id, artwork.title, artwork.artist, artwork.description, artwork.imageUrl, artwork.category);
        const randomVotes = Math.floor(Math.random() * 30) + 5;
        for (let i = 0; i < randomVotes; i++) {
          insertVote.run(uuidv4(), artwork.id, new Date(Date.now() - Math.random() * 86400000 * 7).toISOString());
        }
      }
    });

    transaction();
  }
}

export function getArtworks(): Artwork[] {
  const database = getDb();
  const artworks = database.prepare(`
    SELECT a.*, COUNT(v.id) as voteCount
    FROM artworks a
    LEFT JOIN votes v ON a.id = v.artworkId
    GROUP BY a.id
    ORDER BY a.id
  `).all() as Artwork[];
  return artworks;
}

export function addVote(artworkId: string): number {
  const database = getDb();
  database.prepare('INSERT INTO votes (id, artworkId, createdAt) VALUES (?, ?, ?)').run(uuidv4(), artworkId, new Date().toISOString());
  const result = database.prepare('SELECT COUNT(*) as count FROM votes WHERE artworkId = ?').get(artworkId) as { count: number };
  return result.count;
}

export function getTotalVotes(): number {
  const database = getDb();
  const result = database.prepare('SELECT COUNT(*) as count FROM votes').get() as { count: number };
  return result.count;
}

export function addComment(artworkId: string, username: string, content: string, avatarColor: string): Comment {
  const database = getDb();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  database.prepare('INSERT INTO comments (id, artworkId, username, content, avatarColor, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(id, artworkId, username, content, avatarColor, createdAt);
  return { id, artworkId, username, content, avatarColor, createdAt };
}

export function getComments(artworkId: string): Comment[] {
  const database = getDb();
  return database.prepare('SELECT * FROM comments WHERE artworkId = ? ORDER BY createdAt DESC').all(artworkId) as Comment[];
}
