import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'bookstore.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    tags TEXT DEFAULT '',
    cover TEXT DEFAULT '',
    avg_rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS booklists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS booklist_books (
    booklist_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (booklist_id, book_id),
    FOREIGN KEY (booklist_id) REFERENCES booklists(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, book_id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );
`)

const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }
if (bookCount.count === 0) {
  const insertBook = db.prepare(`
    INSERT INTO books (id, title, author, tags, cover, avg_rating, rating_count)
    VALUES (@id, @title, @author, @tags, @cover, @avg_rating, @rating_count)
  `)

  const books = [
    { id: 'b1', title: '嫌疑人X的献身', author: '东野圭吾', tags: '推理,日本', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20mystery%20novel%20cover%20dark%20blue&image_size=portrait_4_3', avg_rating: 5, rating_count: 1 },
    { id: 'b2', title: '白夜行', author: '东野圭吾', tags: '推理,日本', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=night%20walk%20novel%20cover%20noir&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b3', title: '百年孤独', author: '加西亚·马尔克斯', tags: '文学,魔幻现实', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=solitude%20novel%20cover%20surreal&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b4', title: '三体', author: '刘慈欣', tags: '科幻,中国', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=three%20body%20problem%20scifi%20cover&image_size=portrait_4_3', avg_rating: 4, rating_count: 1 },
    { id: 'b5', title: '活着', author: '余华', tags: '文学,中国', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=living%20novel%20cover%20vintage&image_size=portrait_4_3', avg_rating: 3, rating_count: 1 },
    { id: 'b6', title: '挪威的森林', author: '村上春树', tags: '文学,日本', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=norwegian%20wood%20forest%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b7', title: '恶意', author: '东野圭吾', tags: '推理,日本', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=malice%20mystery%20novel%20red%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b8', title: '银河帝国：基地', author: '艾萨克·阿西莫夫', tags: '科幻,经典', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=foundation%20scifi%20galaxy%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b9', title: '解忧杂货店', author: '东野圭吾', tags: '治愈,日本', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=healing%20bookstore%20warm%20cover&image_size=portrait_4_3', avg_rating: 5, rating_count: 1 },
    { id: 'b10', title: '流浪地球', author: '刘慈欣', tags: '科幻,中国', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wandering%20earth%20scifi%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b11', title: '小王子', author: '安托万·德·圣-埃克苏佩里', tags: '文学,童话', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=little%20prince%20stars%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
    { id: 'b12', title: '沙丘', author: '弗兰克·赫伯特', tags: '科幻,经典', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dune%20desert%20scifi%20epic%20cover&image_size=portrait_4_3', avg_rating: 0, rating_count: 0 },
  ]

  const insertBooklist = db.prepare(`
    INSERT INTO booklists (id, title, description, created_at)
    VALUES (@id, @title, @description, @created_at)
  `)

  const insertBooklistBook = db.prepare(`
    INSERT INTO booklist_books (booklist_id, book_id, sort_order)
    VALUES (@booklist_id, @book_id, @sort_order)
  `)

  const insertRating = db.prepare(`
    INSERT INTO ratings (id, user_id, book_id, score, created_at)
    VALUES (@id, @user_id, @book_id, @score, @created_at)
  `)

  const transaction = db.transaction(() => {
    for (const book of books) {
      insertBook.run(book)
    }

    const booklists = [
      { id: 'bl1', title: '夏日推理精选', description: '炎炎夏日，让推理小说带给你清凉与刺激', created_at: '2026-06-01' },
      { id: 'bl2', title: '科幻世界漫游指南', description: '从地球到宇宙尽头，科幻打开无限想象', created_at: '2026-05-15' },
      { id: 'bl3', title: '文学经典必读', description: '那些改变你人生轨迹的文学巨著', created_at: '2026-04-20' },
    ]
    for (const bl of booklists) {
      insertBooklist.run(bl)
    }

    const booklistBooks = [
      { booklist_id: 'bl1', book_id: 'b1', sort_order: 0 },
      { booklist_id: 'bl1', book_id: 'b2', sort_order: 1 },
      { booklist_id: 'bl1', book_id: 'b7', sort_order: 2 },
      { booklist_id: 'bl1', book_id: 'b9', sort_order: 3 },
      { booklist_id: 'bl2', book_id: 'b4', sort_order: 0 },
      { booklist_id: 'bl2', book_id: 'b8', sort_order: 1 },
      { booklist_id: 'bl2', book_id: 'b10', sort_order: 2 },
      { booklist_id: 'bl2', book_id: 'b12', sort_order: 3 },
      { booklist_id: 'bl3', book_id: 'b3', sort_order: 0 },
      { booklist_id: 'bl3', book_id: 'b5', sort_order: 1 },
      { booklist_id: 'bl3', book_id: 'b6', sort_order: 2 },
      { booklist_id: 'bl3', book_id: 'b11', sort_order: 3 },
    ]
    for (const blb of booklistBooks) {
      insertBooklistBook.run(blb)
    }

    const ratings = [
      { id: 'r1', user_id: '1', book_id: 'b1', score: 5, created_at: '2026-06-10' },
      { id: 'r2', user_id: '1', book_id: 'b4', score: 4, created_at: '2026-06-11' },
      { id: 'r3', user_id: '1', book_id: 'b9', score: 5, created_at: '2026-06-12' },
      { id: 'r4', user_id: '1', book_id: 'b5', score: 3, created_at: '2026-06-13' },
    ]
    for (const rating of ratings) {
      insertRating.run(rating)
    }
  })

  transaction()
}

export default db
