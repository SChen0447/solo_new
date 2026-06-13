import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { bookApi } from '../api';
import type { Book } from '../types';

const LOCAL_USER_ID = 'user-local-' + (localStorage.getItem('visitorId') || (() => {
  const id = Math.random().toString(36).slice(2, 10);
  localStorage.setItem('visitorId', id);
  return id;
})());

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  available: { text: '可交换', color: '#2E7D32', bg: 'rgba(46, 125, 50, 0.12)' },
  exchanging: { text: '交换中', color: '#E65100', bg: 'rgba(230, 81, 0, 0.12)' },
  in_transit: { text: '运输中', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.12)' },
};

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return isoStr;
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i * 0.05, 0.3),
      duration: 0.3,
      ease: 'easeInOut',
    },
  }),
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
};

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newestBookId, setNewestBookId] = useState<string | null>(null);
  const navigate = useNavigate();
  const newestCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('newBookId');
    if (stored) {
      setNewestBookId(stored);
      sessionStorage.removeItem('newBookId');
      setTimeout(() => {
        newestCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      setLoading(true);
      const data = await bookApi.getAllBooks();
      setBooks(data);
    } catch (err) {
      console.error('加载图书失败:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBooks = useMemo(() => {
    let result = books;
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const k = searchTerm.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(k) ||
          b.author.toLowerCase().includes(k) ||
          b.currentHolder.toLowerCase().includes(k)
      );
    }
    return result;
  }, [books, searchTerm, statusFilter]);

  async function handleLike(bookId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updated = await bookApi.toggleLike(bookId, LOCAL_USER_ID);
      setBooks((prev) => prev.map((b) => (b.id === bookId ? updated : b)));
    } catch (err) {
      console.error('点赞失败:', err);
    }
  }

  function isLikedByMe(book: Book): boolean {
    return book.likedBy.includes(LOCAL_USER_ID);
  }

  return (
    <div style={{ padding: '0 32px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#2C2C2C', margin: 0, marginBottom: 4 }}>
            🌊 漂流中的图书
          </h2>
          <p style={{ margin: 0, color: '#6B5B4F', fontSize: 14 }}>
            共 <strong style={{ color: '#8B5E3C' }}>{books.length}</strong> 本好书正等待相遇
          </p>
        </div>

        <button
          onClick={() => navigate('/add')}
          style={{
            padding: '14px 28px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #8B5E3C 0%, #A67850 100%)',
            color: '#F5F0EB',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(139, 94, 60, 0.3)',
            transition: 'all 0.3s ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 94, 60, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 94, 60, 0.3)';
          }}
        >
          ➕ 发布新图书
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 搜索书名、作者或持有人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px',
              paddingLeft: 44,
              borderRadius: 12,
              border: '2px solid #D4C4B5',
              background: '#FFFFFF',
              fontSize: 15,
              color: '#2C2C2C',
              outline: 'none',
              transition: 'all 0.3s ease-in-out',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#8B5E3C')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#D4C4B5')}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: 18,
                cursor: 'pointer',
                color: '#8B5E3C',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'available', label: '可交换' },
            { key: 'exchanging', label: '交换中' },
            { key: 'in_transit', label: '运输中' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: statusFilter === opt.key ? '2px solid #8B5E3C' : '2px solid #D4C4B5',
                background: statusFilter === opt.key ? '#8B5E3C' : '#FFFFFF',
                color: statusFilter === opt.key ? '#F5F0EB' : '#6B5B4F',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#8B5E3C', fontSize: 16 }}>
          📚 正在加载图书...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${searchTerm}-${statusFilter}-${filteredBooks.length}`}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {filteredBooks.map((book, index) => {
              const isNewest = book.id === newestBookId;
              const liked = isLikedByMe(book);
              const statusStyle = statusLabels[book.status] || statusLabels.available;

              return (
                <motion.div
                  key={book.id}
                  ref={isNewest ? newestCardRef : undefined}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -2, transition: { duration: 0.3, ease: 'easeInOut' } }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: isNewest
                      ? '0 8px 28px rgba(139, 94, 60, 0.35)'
                      : '0 2px 12px rgba(139, 94, 60, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.3s ease-in-out',
                    border: isNewest ? '2px solid #8B5E3C' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isNewest) {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 94, 60, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isNewest) {
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(139, 94, 60, 0.1)';
                    }
                  }}
                >
                  <Link
                    to={`/book/${book.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        overflow: 'hidden',
                        background: '#EDE5DC',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          padding: '6px 12px',
                          borderRadius: 20,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {statusStyle.text}
                      </div>
                      {isNewest && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          🆕 NEW
                        </motion.div>
                      )}
                    </div>

                    <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 17,
                          fontWeight: 700,
                          color: '#2C2C2C',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {book.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: '#8B5E3C', fontWeight: 500 }}>
                        ✍️ {book.author}
                      </p>
                      <div style={{ flex: 1 }} />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 10,
                          borderTop: '1px solid #EDE5DC',
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontSize: 12, color: '#9B8B7F' }}>当前持有人</p>
                          <p style={{ margin: 0, fontSize: 14, color: '#2C2C2C', fontWeight: 600 }}>
                            👤 {book.currentHolder}
                          </p>
                        </div>

                        <motion.button
                          onClick={(e) => handleLike(book.id, e)}
                          whileTap={{ scale: liked ? 0.85 : 1.3 }}
                          animate={liked ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 20,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: 4,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              filter: liked ? 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))' : 'none',
                              transition: 'all 0.3s ease-in-out',
                            }}
                          >
                            {liked ? '❤️' : '🤍'}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: liked ? '#EF4444' : '#9B8B7F',
                              minWidth: 20,
                            }}
                          >
                            {book.likes}
                          </span>
                        </motion.button>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: '#9B8B7F', textAlign: 'right' }}>
                        发布于 {formatDate(book.createdAt)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {!loading && filteredBooks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#9B8B7F',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>
            {searchTerm || statusFilter !== 'all' ? '没有找到匹配的图书' : '暂时还没有图书在漂流'}
          </p>
          <p style={{ fontSize: 14, margin: 0 }}>
            {searchTerm || statusFilter !== 'all' ? '试试调整搜索条件吧' : '点击右上角按钮发布第一本图书吧！'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
