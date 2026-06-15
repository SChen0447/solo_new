import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useDebounce } from '../../hooks/useDebounce';
import { CATEGORIES, type Book, type Category } from '../../types';

type FormData = {
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverUrl: string;
  description: string;
  location: string;
};

const emptyForm: FormData = {
  title: '',
  author: '',
  isbn: '',
  category: '小说',
  coverUrl: '',
  description: '',
  location: ''
};

function BookModal({
  isOpen, onClose, onSubmit, initialData, mode
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  initialData?: Book;
  mode: 'add' | 'edit';
}) {
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useMemo(() => {
    if (isOpen && initialData) {
      setFormData({
        title: initialData.title,
        author: initialData.author,
        isbn: initialData.isbn,
        category: initialData.category,
        coverUrl: initialData.coverUrl,
        description: initialData.description || '',
        location: initialData.location || ''
      });
    } else if (isOpen && !initialData) {
      setFormData(emptyForm);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'add' ? '➕ 添加新书' : '✏️ 编辑图书'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>书名 *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="请输入书名"
            />
          </div>
          <div className="form-group">
            <label>作者 *</label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              placeholder="请输入作者姓名"
            />
          </div>
          <div className="form-group">
            <label>ISBN *</label>
            <input
              type="text"
              required
              value={formData.isbn}
              onChange={(e) =>
                setFormData({ ...formData, isbn: e.target.value })
              }
              placeholder="请输入ISBN编号"
            />
          </div>
          <div className="form-group">
            <label>分类 *</label>
            <select
              required
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              {CATEGORIES.filter((c) => c !== '全部').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            </select>
          </div>
          <div className="form-group">
            <label>封面图片URL</label>
            <input
              type="url"
              value={formData.coverUrl}
              onChange={(e) =>
              setFormData({ ...formData, coverUrl: e.target.value })
            }
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>存放位置</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="如：北京市海淀区"
            />
          </div>
          <div className="form-group">
            <label>简介</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="图书内容简介..."
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'add' ? '添加' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  bookTitle
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-content">
          <div className="icon">🗑️</div>
          <h4>确认删除</h4>
          <p>
            确定要删除《{bookTitle}》吗？此操作不可恢复。
          </p>
        </div>
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

function BookList() {
  const navigate = useNavigate();
  const books = useLibraryStore((state) => state.books);
  const addBook = useLibraryStore((state) => state.addBook);
  const updateBook = useLibraryStore((state) => state.updateBook);
  const deleteBook = useLibraryStore((state) => state.deleteBook);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredBooks = useMemo(() => {
    return books.filter((book: Book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        book.author.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === '全部' || book.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, debouncedSearch, selectedCategory]);

  const handleAddBook = async (data: FormData) => {
    await addBook({
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      category: data.category,
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200',
      description: data.description,
      location: data.location
    });
    setIsAddModalOpen(false);
  };

  const handleEditBook = async (data: FormData) => {
    if (!editingBook) return;
    await updateBook(editingBook.id, {
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      category: data.category,
      coverUrl: data.coverUrl,
      description: data.description,
      location: data.location
    });
    setIsEditModalOpen(false);
    setEditingBook(null);
  };

  const handleDeleteBook = async () => {
    if (!deleteTarget) return;
    await deleteBook(deleteTarget.id);
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(book);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="book-list-container">
      <h2 className="page-title">📚 图书管理</h2>

      <div className="add-book-section">
        <div>
          <p style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1a365d' }}>
            📖 管理您的个人藏书
          </p>
          <p>共 {books.length} 本书籍 · {filteredBooks.length} 本符合筛选条件</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setIsAddModalOpen(true)}
        >
          ➕ 添加新书
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === '全部' ? '全部分类' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="card empty-state">
          <img
            src="https://images.unsplash.com/photo-1507842217343-585081e60027?w=400"
            alt="没有数据"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <p>没有找到匹配的书籍</p>
        </div>
      ) : (
        <div className="books-grid">
          {filteredBooks.map((book: Book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => navigate(`/books/${book.id}`)}
            >
              <div className="book-card-header">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="book-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200';
                  }}
                />
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">✍️ {book.author}</div>
                  <div className="book-isbn">ISBN: {book.isbn}</div>
                  <div style={{ marginTop: 'auto' }}>
                    <span
                      className={`status-tag status-${book.status}`}
                    >
                      {book.status === 'available' ? '📗 在架' : '📕 借出'}
                    </span>
                  </div>
                </div>
              </div>
              {book.description && (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#4a5568',
                    marginBottom: '0.75rem',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {book.description}
                </p>
              )}
              <div className="book-card-footer">
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: '#718096'
                  }}
                >
                  📂 {book.category}
                </span>
                <div className="book-actions">
                  <button
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(book);
                    }}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={(e) => openDeleteDialog(book, e)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BookModal
        isOpen={isAddModalOpen}
        mode="add"
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddBook}
      />

      <BookModal
        isOpen={isEditModalOpen}
        mode="edit"
        initialData={editingBook || undefined}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBook(null);
        }}
        onSubmit={handleEditBook}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        bookTitle={deleteTarget?.title || ''}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteBook}
      />
    </div>
  );
}

export default BookList;
