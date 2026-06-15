import React, { useState, useCallback } from 'react';
import useCarbonStore, { EMISSION_FACTORS } from '../store/carbonStore';
import type { ActivityCategory } from '../store/carbonStore';

const SUB_TYPES: Record<ActivityCategory, { value: string; label: string; unit: string }[]> = {
  transport: [
    { value: 'walking', label: '步行', unit: '公里' },
    { value: 'bus', label: '公交', unit: '公里' },
    { value: 'subway', label: '地铁', unit: '公里' },
    { value: 'car', label: '私家车', unit: '公里' },
    { value: 'plane', label: '飞机', unit: '公里' },
  ],
  diet: [
    { value: 'vegetarian', label: '素食', unit: '餐' },
    { value: 'meat', label: '荤食', unit: '餐' },
    { value: 'takeout', label: '外卖', unit: '次' },
  ],
  energy: [
    { value: 'electricity', label: '电', unit: '度' },
    { value: 'gas', label: '天然气', unit: '立方米' },
    { value: 'heating', label: '暖气', unit: '小时' },
  ],
};

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  transport: '🚗 交通',
  diet: '🍽️ 饮食',
  energy: '⚡ 能源',
};

interface ActivityFormProps {
  prefilledCategory?: ActivityCategory;
  prefilledSubType?: string;
  prefilledQuantity?: number;
  onPrefillConsumed?: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  prefilledCategory,
  prefilledSubType,
  prefilledQuantity,
  onPrefillConsumed,
}) => {
  const addActivity = useCarbonStore((s) => s.addActivity);

  const [category, setCategory] = useState<ActivityCategory>(prefilledCategory ?? 'transport');
  const [subType, setSubType] = useState(prefilledSubType ?? 'bus');
  const [quantity, setQuantity] = useState<string>(prefilledQuantity?.toString() ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (prefilledCategory) {
      setCategory(prefilledCategory);
      if (prefilledSubType) setSubType(prefilledSubType);
      if (prefilledQuantity !== undefined) setQuantity(prefilledQuantity.toString());
      onPrefillConsumed?.();
    }
  }, [prefilledCategory, prefilledSubType, prefilledQuantity, onPrefillConsumed]);

  const currentSubTypes = SUB_TYPES[category];
  const currentSubType = currentSubTypes.find((s) => s.value === subType);
  const unit = currentSubType?.unit ?? '';

  const handleCategoryChange = useCallback((newCategory: ActivityCategory) => {
    setCategory(newCategory);
    setSubType(SUB_TYPES[newCategory][0].value);
    setQuantity('');
    setError('');
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseFloat(quantity);

      if (!quantity || isNaN(num)) {
        setError('请输入有效数值');
        return;
      }
      if (num <= 0) {
        setError('数值必须大于0');
        return;
      }
      if (num > 10000) {
        setError('数值超出合理范围');
        return;
      }

      addActivity(category, subType, Math.round(num * 10) / 10);
      setQuantity('');
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
    [quantity, category, subType, addActivity],
  );

  const previewEmission = (() => {
    const num = parseFloat(quantity);
    if (isNaN(num) || num <= 0) return 0;
    const factor = EMISSION_FACTORS[subType] ?? 0;
    return (factor * num).toFixed(2);
  })();

  return (
    <div className="activity-form">
      <h2 className="form-title">记录活动</h2>

      <div className="category-tabs">
        {(Object.keys(SUB_TYPES) as ActivityCategory[]).map((cat) => (
          <button
            key={cat}
            className={`category-tab ${category === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
            type="button"
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">活动类型</label>
          <div className="sub-type-grid">
            {currentSubTypes.map((st) => (
              <button
                key={st.value}
                type="button"
                className={`sub-type-btn ${subType === st.value ? 'active' : ''}`}
                onClick={() => setSubType(st.value)}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            数量 ({unit})
          </label>
          <input
            type="number"
            className="form-input"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError('');
            }}
            placeholder={`请输入${unit}数`}
            min="0"
            step="0.1"
          />
          {error && <span className="form-error">{error}</span>}
        </div>

        {previewEmission && parseFloat(previewEmission) > 0 && (
          <div className="emission-preview">
            <span className="preview-label">预估碳排放</span>
            <span className="preview-value">{previewEmission} kg CO₂e</span>
          </div>
        )}

        <button type="submit" className={`submit-btn ${success ? 'success' : ''}`}>
          {success ? '✓ 已记录' : '添加记录'}
        </button>
      </form>
    </div>
  );
};

export default ActivityForm;
