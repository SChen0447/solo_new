import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useFigureStore } from './store';
import { HobbyFigure } from './types';
import Gallery from './components/Gallery';
import FigureForm from './components/FigureForm';
import Dashboard from './components/Dashboard';

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`text-xl ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
    ))}
  </div>
);

function HomePage() {
  const navigate = useNavigate();
  const { figures, fetchFigures, deleteFigure, loading, error } = useFigureStore();
  const [showDashboard, setShowDashboard] = useState(true);

  useEffect(() => {
    fetchFigures();
  }, [fetchFigures]);

  return (
    <div className="min-h-screen">
      <header className="bg-[#16213e]/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e94560] to-[#f59e0b] flex items-center justify-center text-xl shadow-lg shadow-[#e94560]/30">
              🎎
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">手办收藏阁</h1>
              <p className="text-xs text-gray-500">Figure Collection Gallery</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showDashboard
                  ? 'bg-[#e94560] text-white shadow-lg shadow-[#e94560]/30'
                  : 'bg-[#0f3460] text-gray-300 hover:bg-[#1a4a7a] border border-gray-700'
              }`}
            >
              <span className="sm:hidden">📊</span>
              <span className="hidden sm:inline">📊 统计看板</span>
            </button>
            <button
              onClick={() => navigate('/add')}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-[#e94560] to-[#f59e0b] hover:from-[#d43852] hover:to-[#d97706] text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-[#e94560]/30 hover:shadow-[#e94560]/50"
            >
              <span className="sm:hidden">＋</span>
              <span className="hidden sm:inline">＋ 添加手办</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
            ⚠ {error}
          </div>
        )}

        {loading && figures.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl animate-pulse mb-4">⏳</div>
            <p>加载中...</p>
          </div>
        )}

        {showDashboard && figures.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-white">收藏概览</h2>
            </div>
            <Dashboard />
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">🎴</span>
            <h2 className="text-xl font-bold text-white">我的画廊</h2>
          </div>
          <Gallery
            figures={figures}
            onSelect={(figure) => navigate(`/figure/${figure.id}`)}
            onEdit={(figure) => navigate(`/edit/${figure.id}`)}
            onDelete={async (id) => {
              try {
                await deleteFigure(id);
              } catch (e) {
                console.error('删除失败', e);
              }
            }}
          />
        </section>
      </main>

      <footer className="mt-16 py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-gray-500 text-sm">
          <p>🎎 手办收藏阁 · 记录你的二次元热爱</p>
          <p className="mt-1 text-xs text-gray-600">Made with ❤ by Figure Collector</p>
        </div>
      </footer>
    </div>
  );
}

function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFigureById, deleteFigure, figures } = useFigureStore();

  const figure = figures.find(f => f.id === id) || getFigureById(id);

  if (!figure) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-40">❓</div>
          <h2 className="text-xl text-white mb-2">手办未找到</h2>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-[#e94560] text-white rounded-lg">返回首页</button>
        </div>
      </div>
    );
  }

  const profit = figure.currentValue - figure.purchasePrice;
  const profitRate = figure.purchasePrice > 0
    ? ((figure.currentValue - figure.purchasePrice) / figure.purchasePrice * 100).toFixed(1)
    : '0.0';
  const isProfit = profit >= 0;

  const infoItems = [
    { label: '作品名称', value: figure.workName, icon: '📖' },
    { label: '角色名称', value: figure.characterName, icon: '👤' },
    { label: '厂商', value: figure.manufacturer, icon: '🏭' },
    { label: '作品系列', value: figure.series, icon: '📚' },
    { label: '比例', value: figure.scale, icon: '📐' },
    { label: '材质', value: figure.material, icon: '🧱' },
    { label: '购入日期', value: figure.purchaseDate, icon: '📅' },
    { label: '存放位置', value: figure.storageLocation || '未设置', icon: '📍' }
  ];

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <header className="bg-[#16213e]/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <span className="text-xl">←</span>
            <span className="hidden sm:inline">返回画廊</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/edit/${figure.id}`)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              ✏️ 编辑
            </button>
            <button
              onClick={async () => {
                if (confirm(`确定删除「${figure.characterName}」吗？`)) {
                  try {
                    await deleteFigure(figure.id);
                    navigate('/');
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-[#16213e] rounded-2xl overflow-hidden border border-gray-800">
          <div className="h-56 sm:h-72 bg-gradient-to-br from-[#0f3460] via-[#16213e] to-[#e94560]/20 flex items-center justify-center relative">
            <div className="text-[120px] sm:text-[160px] opacity-25 select-none">🎎</div>
            <div className="absolute top-4 left-4 px-3 py-1 bg-[#e94560] text-white text-sm rounded-full font-medium">
              {figure.scale}
            </div>
            <div className="absolute bottom-4 right-4">
              <StarRating rating={figure.condition} />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 pb-6 border-b border-gray-700/50">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{figure.characterName}</h1>
              <p className="text-lg text-gray-400">{figure.workName}</p>
              <p className="text-sm text-gray-500 mt-1">{figure.manufacturer}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {infoItems.map(item => (
                <div key={item.label} className="p-4 bg-[#0f3460]/50 rounded-xl border border-gray-700/30">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div className="text-white font-medium truncate">{item.value}</div>
                </div>
              ))}
            </div>

            <div className={`p-5 sm:p-6 rounded-2xl border ${isProfit ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-[#0f3460]' : 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-[#0f3460]'}`}>
              <h3 className="text-sm font-medium text-gray-400 mb-4">💰 估价详情</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">购入价格</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">¥{figure.purchasePrice.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">当前估价</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">¥{figure.currentValue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">盈亏</div>
                  <div className={`text-xl sm:text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {isProfit ? '+' : ''}¥{profit.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">溢价率</div>
                  <div className={`text-xl sm:text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {isProfit ? '↑' : '↓'} {Math.abs(Number(profitRate))}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addFigure, updateFigure, getFigureById, figures, loading } = useFigureStore();

  const existingFigure = mode === 'edit' && id
    ? (figures.find(f => f.id === id) || getFigureById(id))
    : null;

  const handleSubmit = async (data: Omit<HobbyFigure, 'id'>) => {
    try {
      if (mode === 'add') {
        await addFigure(data);
        navigate('/');
      } else if (mode === 'edit' && id) {
        await updateFigure(id, data);
        navigate(`/figure/${id}`);
      }
    } catch (e) {
      console.error('保存失败', e);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <header className="bg-[#16213e]/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <span className="text-xl">←</span>
            <span className="hidden sm:inline">返回</span>
          </button>
          <h1 className="text-lg font-bold text-white">
            {mode === 'add' ? '➕ 添加新藏品' : '✏️ 编辑藏品'}
          </h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-[#16213e] rounded-2xl p-6 sm:p-8 border border-gray-800">
          <FigureForm
            initialData={existingFigure}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add" element={<FormPage mode="add" />} />
      <Route path="/edit/:id" element={<FormPage mode="edit" />} />
      <Route path="/figure/:id" element={<DetailPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
