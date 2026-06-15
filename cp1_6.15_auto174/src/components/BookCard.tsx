import type { Book } from '@/types';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

const statusMap: Record<Book['status'], { label: string; color: string }> = {
  available: { label: '在馆', color: 'bg-status-available' },
  borrowed: { label: '借出', color: 'bg-status-borrowed' },
  reserved: { label: '预约', color: 'bg-status-reserved' },
};

export default function BookCard({ book, onSelect }: BookCardProps) {
  const status = statusMap[book.status];

  return (
    <div
      onClick={() => onSelect(book)}
      className="w-[200px] h-[320px] rounded-card bg-surface-white shadow-card cursor-pointer flex flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-card-hover"
    >
      <div className="h-[60%] w-full overflow-hidden bg-gray-100">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-light/20 to-primary-dark/20">
            <span className="text-4xl opacity-30">📖</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
            {book.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">{book.author}</p>
        </div>
        <span
          className={`self-start rounded-full px-3 py-0.5 text-xs font-medium text-white ${status.color}`}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}
