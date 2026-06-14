import { useState, useEffect } from 'react';
import { HobbyFigure, MANUFACTURERS, SERIES } from '../types';

interface FigureFormProps {
  initialData?: HobbyFigure | null;
  onSubmit: (data: Omit<HobbyFigure, 'id'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const StarInput = ({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="text-2xl transition-transform hover:scale-110 active:scale-95"
        >
          <span className={i <= (hover || value) ? 'text-yellow-400' : 'text-gray-600'}>★</span>
        </button>
      ))}
    </div>
  );
};

export default function FigureForm({ initialData, onSubmit, onCancel, loading }: FigureFormProps) {
  const [formData, setFormData] = useState<Omit<HobbyFigure, 'id'>>({
    workName: '',
    characterName: '',
    manufacturer: MANUFACTURERS[0],
    series: SERIES[0],
    scale: '1/7',
    material: 'PVC, ABS',
    purchasePrice: 0,
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    condition: 5,
    storageLocation: ''
  });

  useEffect(() => {
    if (initialData) {
      const { id, createdAt, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData]);

  const profit = formData.currentValue - formData.purchasePrice;
  const profitRate = formData.purchasePrice > 0
    ? ((formData.currentValue - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)
    : '0.0';
  const isProfit = profit >= 0;

  const updateField = (key: keyof Omit<HobbyFigure, 'id'>, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workName.trim() || !formData.characterName.trim()) {
      alert('请填写作品名称和角色名称');
      return;
    }
    onSubmit(formData);
  };

  const inputClass = "w-full px-3 py-2 bg-[#0f3460] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#e94560] transition-colors";
  const labelClass = "block text-sm text-gray-400 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>作品名称 <span className="text-[#e94560]">*</span></label>
          <input
            type="text"
            value={formData.workName}
            onChange={e => updateField('workName', e.target.value)}
            placeholder="例如：原神、鬼灭之刃"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>角色名称 <span className="text-[#e94560]">*</span></label>
          <input
            type="text"
            value={formData.characterName}
            onChange={e => updateField('characterName', e.target.value)}
            placeholder="例如：雷电将军、祢豆子"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>厂商</label>
          <select
            value={formData.manufacturer}
            onChange={e => updateField('manufacturer', e.target.value)}
            className={inputClass}
          >
            {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>作品系列</label>
          <select
            value={formData.series}
            onChange={e => updateField('series', e.target.value)}
            className={inputClass}
          >
            {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>比例</label>
          <select
            value={formData.scale}
            onChange={e => updateField('scale', e.target.value)}
            className={inputClass}
          >
            <option value="1/4">1/4</option>
            <option value="1/6">1/6</option>
            <option value="1/7">1/7</option>
            <option value="1/8">1/8</option>
            <option value="1/9">1/9</option>
            <option value="1/10">1/10</option>
            <option value="1/12">1/12</option>
            <option value="无比例">无比例</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>材质</label>
          <input
            type="text"
            value={formData.material}
            onChange={e => updateField('material', e.target.value)}
            placeholder="例如：PVC, ABS, 树脂"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>购入价格 (¥)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.purchasePrice}
            onChange={e => updateField('purchasePrice', Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>当前市场估价 (¥)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.currentValue}
            onChange={e => updateField('currentValue', Number(e.target.value) || 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>购入日期</label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={e => updateField('purchaseDate', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>存放位置</label>
          <input
            type="text"
            value={formData.storageLocation}
            onChange={e => updateField('storageLocation', e.target.value)}
            placeholder="例如：展示柜A-1"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>品相评级</label>
        <StarInput value={formData.condition} onChange={v => updateField('condition', v)} />
      </div>

      <div className={`p-4 rounded-xl border ${isProfit ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
        <div className="text-xs text-gray-400 mb-2">溢价率预览</div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <span className="text-gray-500 text-sm">购入总计: </span>
            <span className="text-white font-semibold">¥{formData.purchasePrice.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500 text-sm">当前估价: </span>
            <span className="text-white font-semibold">¥{formData.currentValue.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500 text-sm">差额: </span>
            <span className={`font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}¥{profit.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-sm">溢价率: </span>
            <span className={`text-lg font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '↑' : '↓'} {Math.abs(Number(profitRate))}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-[#0f3460] hover:bg-[#1a4a7a] text-white rounded-lg transition-colors border border-gray-700"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-[#e94560] hover:bg-[#d43852] disabled:bg-[#e94560]/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? '保存中...' : (initialData ? '保存修改' : '添加手办')}
        </button>
      </div>
    </form>
  );
}
