import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'library.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT DEFAULT '',
    isbn TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    quantity INTEGER DEFAULT 1,
    qr_code TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    avatar TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrowings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    FOREIGN KEY(book_id) REFERENCES books(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(book_id) REFERENCES books(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating>=1 AND rating<=5),
    status TEXT NOT NULL DEFAULT 'pending',
    reject_reason TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    audited_at DATETIME,
    FOREIGN KEY(book_id) REFERENCES books(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
  CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings(book_id);
  CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON borrowings(user_id);
  CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
  CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON reservations(book_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
  CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
`)

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: number } | undefined

if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
  ).run('admin', hash, '管理员', 'admin')
}

const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }

if (bookCount.count === 0) {
  const insertBook = db.prepare(
    'INSERT INTO books (title, author, description, isbn, quantity) VALUES (?, ?, ?, ?, ?)'
  )

  const sampleBooks = [
    ['红楼梦', '曹雪芹', '中国古典四大名著之首，以贾、史、王、薛四大家族的兴衰为背景。', '978-7-02-000220-3', 3],
    ['百年孤独', '加西亚·马尔克斯', '魔幻现实主义文学代表作，讲述布恩迪亚家族七代人的传奇故事。', '978-7-54-426878-4', 2],
    ['三体', '刘慈欣', '中国科幻里程碑之作，揭示宇宙文明间的黑暗森林法则。', '978-7-53-670678-6', 4],
    ['活着', '余华', '讲述一个人历经苦难仍然坚韧活着的生命故事。', '978-7-50-637906-7', 2],
    ['小王子', '圣埃克苏佩里', '一部写给大人的童话，关于爱、责任与生命的本质。', '978-7-02-004267-4', 3],
    ['人类简史', '尤瓦尔·赫拉利', '从认知革命到科学革命，重新审视人类历史的宏大叙事。', '978-7-50-866075-2', 2],
    ['围城', '钱钟书', '中国现代文学经典，以方鸿渐的人生际遇折射世态人情。', '978-7-02-002345-1', 1],
    ['挪威的森林', '村上春树', '一部关于青春、爱情与迷失的细腻物语。', '978-7-53-274967-8', 2],
  ]

  const insertMany = db.transaction((books: string[][]) => {
    for (const book of books) {
      insertBook.run(...book)
    }
  })

  insertMany(sampleBooks)
}

export default db
