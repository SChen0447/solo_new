import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookById, EDITION_NAMES, EDITION_PRICES, calculateItemPrice } from './api/books';
import type { Book } from './api/books';
import { useCartStore } from './store/useCartStore';
import Book3DPreview from './components/Book3DPreview';
import Button from './components/Button';
import Input from './components/Input';
import Skeleton from './components/Skeleton';
import './BookDetail.css';

type Edition = 'hardcover' | 'special' | 'collectors';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((state: { addItem: any }) => state.addItem);
  const toggleCart = useCartStore((state: { toggleCart: any }) => state.toggleCart);
  const cartItems = useCartStore((state: { items: any[] }) => state.items);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<Edition>('hardcover');
  const [engraving, setEngraving] = useState('');
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchBook = async () => {
      try {
        const data = await getBookById(id);
        setBook(data);
      } catch (error) {
        console.error('Failed to fetch book:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setModelLoaded(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const currentPrice = useMemo(() => {
    if (!book) return 0;
    return calculateItemPrice(book.price, selectedEdition);
  }, [book, selectedEdition]);

  const handleAddToCart = () => {
    if (!book) return;
    addItem(book, selectedEdition, engraving);
  };

  if (loading) {
    return (
      <div className="book-detail-page">
        <div className="detail-container">
          <div className="detail-left">
            <Skeleton variant="rect" height={500} />
          </div>
          <div className="detail-right">
            <Skeleton variant="text" width="80%" height={32} />
            <Skeleton variant="text" width="60%" height={20} />
            <div style={{ margin: '24px 0' }}>
              <Skeleton variant="text" width="100%" height={80} />
            </div>
            <Skeleton variant="rect" height={50} width={120} />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-detail-page">
        <div className="not-found">
          <h2>未找到该书籍</h2>
          <Button onClick={() => navigate('/')}>返回列表</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-detail-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="detail-container">
        <div className="detail-left">
          <div className={`preview-wrapper ${modelLoaded ? 'fade-in' : 'opacity-0'}`}>
            <Book3DPreview
              book={book}
              edition={selectedEdition}
              engraving={engraving}
            />
          </div>
          <p className="preview-hint">拖动旋转查看 · 滚轮缩放</p>
        </div>

        <div className="detail-right">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">{book.author}</p>
          
          <div className="book-meta">
            <div className="meta-item">
              <span className="meta-label">出版社</span>
              <span className="meta-value">{book.publisher}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">出版日期</span>
              <span className="meta-value">{book.publishDate}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">页数</span>
              <span className="meta-value">{book.pages}页</span>
            </div>
          </div>

          <p className="book-description">{book.description}</p>

          <div className="special-features">
            <h4 className="features-title">特装特色</h4>
            <div className="features-list">
              {book.specialFeatures.map((feature: string, index: number) => (
                <span key={index} className="feature-tag">
                  ✦ {feature}
                </span>
              ))}
            </div>
          </div>

          <div className="edition-section">
            <h4 className="section-title">选择装帧版本</h4>
            <div className="edition-buttons">
              {(['hardcover', 'special', 'collectors'] as Edition[]).map(edition => (
                <button
                  key={edition}
                  className={`edition-btn ${selectedEdition === edition ? 'selected' : ''}`}
                  onClick={() => setSelectedEdition(edition)}
                >
                  <span className="edition-name">{EDITION_NAMES[edition]}</span>
                  <span className="edition-price">
                    ¥{calculateItemPrice(book.price, edition)}
                  </span>
                  <span className="edition-multiplier">×{EDITION_PRICES[edition]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="engraving-section">
            <h4 className="section-title">个性化刻字（可选）</h4>
            <Input
              value={engraving}
              onChange={setEngraving}
              placeholder="输入刻字内容，最多20字"
              maxLength={20}
            />
            <p className="engraving-hint">刻字将呈现在书籍封面上</p>
          </div>

          <div className="price-section">
            <span className="price-label">预订价格</span>
            <span className="price-value">¥{currentPrice}</span>
          </div>

          <div className="action-buttons">
            <Button
              variant="gold"
              onClick={handleAddToCart}
              className="add-to-cart-btn"
            >
              加入预订
            </Button>
            <Button
              variant="secondary"
              onClick={toggleCart}
            >
              购物车 ({cartItems.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
