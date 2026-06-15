import { useEffect, useState } from 'react';
import { Clock, BookMarked } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { BorrowRecord, ReservationRecord } from '@/types';

function getProgressColor(remaining: number, total: number): string {
  const ratio = remaining / total;
  if (ratio > 0.5) return '#4caf50';
  if (ratio > 0.2) return '#ff9800';
  return '#f44336';
}

export default function Profile() {
  const { user } = useAuthStore();
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [borrowsRes, reservesRes] = await Promise.all([
          axios.get('/api/users/me/borrows'),
          axios.get('/api/users/me/reservations'),
        ]);
        setBorrows(borrowsRes.data ?? []);
        setReservations(reservesRes.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 pt-[100px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-light border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-6 pt-[84px] pb-12 animate-fadeIn">
      <div className="mb-8 flex items-center gap-4">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-dark text-white text-xl font-bold">
            {user?.displayName?.charAt(0) ?? 'U'}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-800">{user?.displayName}</h1>
          <p className="text-sm text-gray-500">@{user?.username}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
          <BookMarked className="h-5 w-5 text-primary-light" />
          借阅记录
        </h2>
        {borrows.length === 0 ? (
          <p className="text-sm text-gray-400">暂无借阅记录</p>
        ) : (
          <div className="space-y-2">
            {borrows.map((record) => {
              const dueDate = new Date(record.dueDate);
              const now = new Date();
              const remaining = Math.max(
                0,
                Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              );
              const total = 14;
              const progress = Math.min(remaining / total, 1);
              const color = getProgressColor(remaining, total);

              return (
                <div
                  key={record.id}
                  className="flex h-14 items-center justify-between rounded-xl bg-surface-white px-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800 line-clamp-1">
                      {record.bookTitle}
                    </span>
                    <span className="text-xs text-gray-400">
                      {record.borrowDate} ~ {record.dueDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {record.status === 'returned'
                        ? '已归还'
                        : `剩余${remaining}天`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
          <Clock className="h-5 w-5 text-status-reserved" />
          预约记录
        </h2>
        {reservations.length === 0 ? (
          <p className="text-sm text-gray-400">暂无预约记录</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((record) => (
              <div
                key={record.id}
                className="flex h-14 items-center justify-between rounded-xl bg-surface-white px-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 line-clamp-1">
                    {record.bookTitle}
                  </span>
                  <span className="text-xs text-gray-400">{record.reserveDate}</span>
                </div>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium text-white ${
                    record.status === 'waiting'
                      ? 'bg-status-reserved'
                      : record.status === 'fulfilled'
                        ? 'bg-status-available'
                        : 'bg-gray-400'
                  }`}
                >
                  {record.status === 'waiting'
                    ? '等待中'
                    : record.status === 'fulfilled'
                      ? '已到馆'
                      : '已取消'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
