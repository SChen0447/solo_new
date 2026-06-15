import { useEmotionContext, EmotionProvider } from './context';
import EmotionSelector from './components/EmotionSelector';
import EmotionCalendar from './components/EmotionCalendar';
import StatsPanel from './components/StatsPanel';

function Dashboard() {
  const { clearAll, exportJSON, totalCount } = useEmotionContext();

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有记录数据吗？此操作不可恢复。')) {
      clearAll();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-emoji">📊</span> 情绪数据看板
        </h1>
        <p className="app-subtitle">记录每一天的心情，看见自己的情绪变化</p>
      </header>

      <main className="main-content">
        <div className="left-column">
          <EmotionSelector />
          <EmotionCalendar />
        </div>
        <div className="right-column">
          <StatsPanel />
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-tip">共 {totalCount} 条记录</span>
        </div>
        <div className="footer-right">
          <button className="clear-btn" onClick={handleClearAll}>
            🗑️ 清除所有数据
          </button>
          <button className="export-btn" onClick={exportJSON}>
            ⬇️ 导出 JSON
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <EmotionProvider>
      <Dashboard />
    </EmotionProvider>
  );
}
