import { Menu, Sparkles } from 'lucide-react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { DebatePanel } from './components/DebatePanel';
import { VoteChart } from './components/VoteChart';
import type { RankingItem } from './types';

export default function App() {
  const { sidebarOpen, toggleSidebar, currentRound, rankings, currentSession } = useStore();

  const showRightPanel = currentRound >= 3 && rankings.length > 0;

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-[#E0E0E0]">
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      <div className="flex min-h-screen">
        <div className="hidden lg:block w-[250px] flex-shrink-0" />

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 bg-[#1E1E1E]/95 backdrop-blur-sm border-b border-gray-800">
            <div className="flex items-center justify-between px-4 md:px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSidebar}
                  className="btn-hover p-2 rounded-lg hover:bg-[#2a2a2a] lg:hidden"
                >
                  <Menu size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#FF5722]" size={24} />
                  <h1 className="text-lg md:text-xl font-bold">AI文案辩论评估平台</h1>
                </div>
              </div>
              {currentSession && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                  <span>{currentSession.productName}</span>
                </div>
              )}
            </div>
          </header>

          <div className="flex">
            <div className="flex-1 min-w-0 px-4 md:px-6 py-6">
              <DebatePanel />
            </div>

            {showRightPanel && (
              <aside className="hidden lg:block w-[320px] flex-shrink-0 border-l border-gray-800 p-6">
                <div className="sticky top-24">
                  <VoteChart rankings={rankings as RankingItem[]} />
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>

      {useStore.getState().error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg
          shadow-lg flex items-center gap-2">
          <span>{useStore.getState().error}</span>
          <button
            onClick={() => useStore.getState().setError(null)}
            className="text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
