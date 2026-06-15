import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useBookStore } from '@/stores/bookStore';
import BookCard from '@/components/BookCard';
import BookDetailModal from '@/components/BookDetailModal';
import type { Book } from '@/types';

const PAGE_SIZE = 12;

export default function BookList() {
  const { books, total, currentPage, search, statusFilter, loading, fetchBooks } = useBookStore();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetchBooks(1, '', '');
  }, [fetchBooks]);

  const handleSearch = () => {
    fetchBooks(1, searchInput, statusFilter);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleStatusChange = (status: string) => {
    fetchBooks(1, search, status);
  };

  const handlePageChange = (page: number) => {
    fetchBooks(page, search, statusFilter);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-[84px] pb-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索书名或作者..."
            className="w-full rounded-button border border-gray-200 bg-surface-white py-2.5 pl-10 pr-4 text-sm text-gray-700 transition-colors duration-200 placeholder:text-gray-400 focus:border-primary-light focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-button border border-gray-200 bg-surface-white px-4 py-2.5 text-sm text-gray-700 transition-colors duration-200 focus:border-primary-light focus:outline-none"
        >
          <option value="">全部状态</option>
          <option value="available">在馆</option>
          <option value="borrowed">借出</option>
          <option value="reserved">预约中</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-4">📚</span>
          <p className="text-sm">暂无书籍</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 justify-items-center">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onSelect={setSelectedBook} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, idx, arr) => (
                  <span key={page} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        page === currentPage
                          ? 'bg-gradient-to-r from-primary-light to-primary-dark text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
