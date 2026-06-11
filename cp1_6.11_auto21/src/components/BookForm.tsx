import { useState, useEffect, useCallback } from 'react';
import type { Book, BookFormData, BookStatus } from '@/types';
import { COVER_EMOJIS, COVER_COLORS, getRandomCover } from '@/types';

interface BookFormProps {
  book?: Book | null;
  onSubmit: (data: BookFormData) => void;
  onCancel: () => void;
}

export const BookForm = ({ book, onSubmit, onCancel }: BookFormProps) => {
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [isbn, setIsbn] = useState(book?.isbn ?? '');
  const [year, setYear] = useState<string>(book?.year ? String(book.year) : '');
  const [coverEmoji, setCoverEmoji] = useState(book?.cover.emoji ?? COVER_EMOJIS[0]);
  const [coverColor, setCoverColor] = useState(book?.cover.color ?? COVER_COLORS[0].bg);
  const [status, setStatus] = useState<BookStatus>(book?.status ?? 'available');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!book) {
      const random = getRandomCover();
      setCoverEmoji(random.emoji);
      setCoverColor(random.color);
    }
  }, [book]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入书名';
    if (!author.trim()) newErrors.author = '请输入作者';
    if (year) {
      const y = Number(year);
      if (isNaN(y) || y < 1900 || y > 2025) {
        newErrors.year = '年份需在1900-2025之间';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, author, year]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || undefined,
      year: year ? Number(year) : undefined,
      cover: { emoji: coverEmoji, color: coverColor },
      status,
    });
  };

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{book ? '编辑书籍' : '添加新书'}</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="title">书名 <span className="required">*</span></label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={errors.title ? 'input-error' : ''}
            placeholder="请输入书名"
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="author">作者 <span className="required">*</span></label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={errors.author ? 'input-error' : ''}
            placeholder="请输入作者"
          />
          {errors.author && <span className="error-text">{errors.author}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="isbn">ISBN</label>
          <input
            id="isbn"
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="可选"
          />
        </div>
        <div className="form-group">
          <label htmlFor="year">出版年份</label>
          <input
            id="year"
            type="number"
            min={1900}
            max={2025}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={errors.year ? 'input-error' : ''}
            placeholder="1900-2025"
          />
          {errors.year && <span className="error-text">{errors.year}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>封面图标</label>
          <div className="emoji-picker">
            {COVER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-option ${coverEmoji === emoji ? 'selected' : ''}`}
                onClick={() => setCoverEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>封面颜色</label>
          <div className="color-picker">
            {COVER_COLORS.map(({ bg, label }) => (
              <button
                key={bg}
                type="button"
                className={`color-option ${coverColor === bg ? 'selected' : ''}`}
                style={{ backgroundColor: bg }}
                onClick={() => setCoverColor(bg)}
                title={label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>当前状态</label>
          <div className="status-radio">
            <label className="radio-label">
              <input
                type="radio"
                name="status"
                value="available"
                checked={status === 'available'}
                onChange={() => setStatus('available')}
              />
              <span>在架</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="status"
                value="borrowed"
                checked={status === 'borrowed'}
                onChange={() => setStatus('borrowed')}
              />
              <span>借出</span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-preview">
        <label>封面预览</label>
        <div className="preview-cover" style={{ backgroundColor: coverColor }}>
          <span className="preview-emoji">{coverEmoji}</span>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          {book ? '保存修改' : '添加书籍'}
        </button>
      </div>
    </form>
  );
};
