import { useState, useMemo } from 'react';
import { HobbyFigure, MANUFACTURERS, SERIES } from '../types';
import { MANUFACTURER_COLORS } from '../types';

interface GalleryProps {
  figures: HobbyFigure[];
  onSelect: (figure: HobbyFigure) => void;
  onEdit: (figure: HobbyFigure) => void;
  onDelete: (id: string) => void;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={`text-sm ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
      >
        ★
      </span>
    ))}
  </div>
);

const ManufacturerLogo = ({ name }: { name: string }) => {
  const color = MANUFACTURER_COLORS[name] || '#6b7280';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials || '?'}
    </div>
  );
};

const FigureCard = ({
  figure,
  onClick,
  onEdit,
  onDelete
}: {
  figure: HobbyFigure;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const profit = figure.currentValue - figure.purchasePrice;
  const profitRate = figure.purchasePrice > 0
    ? ((figure.currentValue - figure.purchasePrice) / figure.purchasePrice * 100).toFixed(1)
    : '0.0';
  const isProfit = profit >= 0;

  return (
    <div
      className="relative bg-[#16213e] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group"
      style={{
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 20px 40px rgba(233, 69, 96, 0.25), 0 0 0 1px rgba(233, 69, 96, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
        >
          编辑
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
        >
          删除
        </button>
      </div>

      <div className="h-40 bg-gradient-to-br from-[#0f3460] to-[#16213e] flex items-center justify-center relative overflow-hidden">
        <div className="text-6xl opacity-30">🎎</div>
        <div className="absolute top-3 left-3">
          <ManufacturerLogo name={figure.manufacturer} />
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="px-2 py-0.5 bg-[#e94560] text-white text-xs rounded-full font-medium">
            {figure.scale}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-white truncate">{figure.characterName}</h3>
          <p className="text-sm text-gray-400 truncate">{figure.workName}</p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 truncate max-w-[60%]">{figure.manufacturer}</span>
          <StarRating rating={figure.condition} />
        </div>

        <div className="border-t border-gray-700/50 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">当前估价</span>
            <span className={`text-lg font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              ¥{figure.currentValue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-600">购入 ¥{figure.purchasePrice.toLocaleString()}</span>
            <span className={`text-xs font-medium ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {isProfit ? '↑' : '↓'} {Math.abs(Number(profitRate))}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Gallery({ figures, onSelect, onEdit, onDelete }: GalleryProps) {
  const [seriesFilter, setSeriesFilter] = useState<string>('全部');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('全部');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [search, setSearch] = useState('');

  const filteredFigures = useMemo(() => {
    let result = [...figures];

    if (seriesFilter !== '全部') {
      result = result.filter(f => f.series === seriesFilter);
    }
    if (manufacturerFilter !== '全部') {
      result = result.filter(f => f.manufacturer === manufacturerFilter);
    }
    if (search.trim()) {
      const keyword = search.toLowerCase();
      result = result.filter(f =>
        f.characterName.toLowerCase().includes(keyword) ||
        f.workName.toLowerCase().includes(keyword) ||
        f.manufacturer.toLowerCase().includes(keyword)
      );
    }

    switch (sortBy) {
      case 'value-desc':
        result.sort((a, b) => b.currentValue - a.currentValue);
        break;
      case 'value-asc':
        result.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'profit-desc':
        result.sort((a, b) => (b.currentValue - b.purchasePrice) - (a.currentValue - a.purchasePrice));
        break;
      case 'date-desc':
        result.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt || b.purchaseDate).getTime() - new Date(a.createdAt || a.purchaseDate).getTime());
    }

    return result;
  }, [figures, seriesFilter, manufacturerFilter, sortBy, search]);

  return (
    <div>
      <div className="bg-[#16213e] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">搜索</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="角色/作品/厂商..."
              className="w-full px-3 py-2 bg-[#0f3460] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e94560] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">作品系列</label>
            <select
              value={seriesFilter}
              onChange={e => setSeriesFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f3460] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#e94560] transition-colors"
            >
              <option value="全部">全部系列</option>
              {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">厂商</label>
            <select
              value={manufacturerFilter}
              onChange={e => setManufacturerFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f3460] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#e94560] transition-colors"
            >
              <option value="全部">全部厂商</option>
              {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">排序</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f3460] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#e94560] transition-colors"
            >
              <option value="newest">最新添加</option>
              <option value="date-desc">购入日期 ↓</option>
              <option value="value-desc">估价从高到低</option>
              <option value="value-asc">估价从低到高</option>
              <option value="profit-desc">收益排序</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          共 <span className="text-[#e94560] font-semibold">{filteredFigures.length}</span> 件藏品
        </div>
      </div>

      {filteredFigures.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-6xl mb-4 opacity-30">📦</div>
          <p className="text-lg">暂无手办藏品</p>
          <p className="text-sm mt-2">点击右上角「添加手办」开始记录你的收藏</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFigures.map(figure => (
            <FigureCard
              key={figure.id}
              figure={figure}
              onClick={() => onSelect(figure)}
              onEdit={() => onEdit(figure)}
              onDelete={() => {
                if (confirm(`确定删除「${figure.characterName}」吗？`)) {
                  onDelete(figure.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
