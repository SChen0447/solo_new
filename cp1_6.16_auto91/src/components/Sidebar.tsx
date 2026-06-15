import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Package } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { DebateSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { history, fetchHistory, loadHistory, isLoading } = useStore();

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSessionClick = (session: DebateSession) => {
    loadHistory(session.id);
    onClose();
  };

  const getTop3Summaries = (session: DebateSession) => {
    return session.finalRankings.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      content: r.content.slice(0, 15) + '...'
    }));
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 left-0 h-full w-[250px] bg-[#2a2a2a] z-50 shadow-xl
          flex flex-col border-r border-gray-700`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-[#E0E0E0] flex items-center gap-2">
            <Clock size={18} className="text-[#FF5722]" />
            历史记录
          </h2>
          <button
            onClick={onClose}
            className="btn-hover p-1 rounded-lg hover:bg-gray-700 text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Package size={40} className="mx-auto mb-3 opacity-50" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((session) => {
                const summaries = getTop3Summaries(session);
                return (
                  <motion.div
                    key={session.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSessionClick(session)}
                    className="btn-hover bg-[#1E1E1E] rounded-lg p-3 cursor-pointer
                      border border-gray-700 hover:border-[#FF5722] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(session.createdAt)}
                      </span>
                      <Play size={14} className="text-[#4CAF50]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#E0E0E0] mb-2 truncate">
                      {session.productName}
                    </h3>
                    <div className="space-y-1">
                      {summaries.map((s) => (
                        <div key={s.rank} className="flex items-center gap-2 text-xs">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px]
                            ${s.rank === 1 ? 'bg-yellow-500' : s.rank === 2 ? 'bg-gray-400' : 'bg-amber-600'}
                            text-white font-bold`}>
                            {s.rank}
                          </span>
                          <span className="text-gray-400 truncate">{s.content}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
