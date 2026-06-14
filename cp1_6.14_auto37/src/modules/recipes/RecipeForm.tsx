import React, { useState, useEffect } from 'react';
import { RecipeFormData } from './types';
import './RecipeForm.css';

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: RecipeFormData) => void;
  onCancel?: () => void;
}

const defaultFormData: RecipeFormData = {
  name: '',
  beanOrigin: '',
  roastLevel: 'medium',
  grindSize: 'medium',
  waterTemp: 92,
  ratio: 15,
  brewTime: 120,
  flavorRating: 7,
  notes: '',
};

interface FormErrors {
  name?: string;
  beanOrigin?: string;
  waterTemp?: string;
  ratio?: string;
  brewTime?: string;
  notes?: string;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<RecipeFormData>(
    initialData || defaultFormData
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入配方名称';
    }

    if (!formData.beanOrigin.trim()) {
      newErrors.beanOrigin = '请输入豆种';
    }

    if (formData.waterTemp < 70 || formData.waterTemp > 100) {
      newErrors.waterTemp = '水温需在70-100℃之间';
    }

    if (formData.ratio < 10 || formData.ratio > 20) {
      newErrors.ratio = '比例需在1:10~1:20之间';
    }

    if (formData.brewTime < 1 || formData.brewTime > 300) {
      newErrors.brewTime = '冲煮时间需在1-300秒之间';
    }

    if (formData.notes.length > 300) {
      newErrors.notes = '备注不能超过300字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">配方名称 *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="给这个配方起个名字"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="beanOrigin">豆种 *</label>
        <input
          type="text"
          id="beanOrigin"
          name="beanOrigin"
          value={formData.beanOrigin}
          onChange={handleChange}
          placeholder="例如：埃塞俄比亚耶加雪菲"
        />
        {errors.beanOrigin && (
          <span className="error-text">{errors.beanOrigin}</span>
        )}
      </div>

      <div className="form-group">
        <label>烘焙度</label>
        <div className="radio-group">
          {[
            { value: 'light', label: '浅烘焙' },
            { value: 'medium', label: '中烘焙' },
            { value: 'dark', label: '深烘焙' },
          ].map((option) => (
            <label key={option.value} className="radio-label">
              <input
                type="radio"
                name="roastLevel"
                value={option.value}
                checked={formData.roastLevel === option.value}
                onChange={handleChange}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="grindSize">研磨度</label>
        <select
          id="grindSize"
          name="grindSize"
          value={formData.grindSize}
          onChange={handleChange}
        >
          <option value="coarse">粗研磨</option>
          <option value="medium-coarse">中粗研磨</option>
          <option value="medium">中研磨</option>
          <option value="fine">细研磨</option>
          <option value="extra-fine">极细研磨</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="waterTemp">水温：{formData.waterTemp}℃ *</label>
        <input
          type="range"
          id="waterTemp"
          name="waterTemp"
          min="70"
          max="100"
          step="1"
          value={formData.waterTemp}
          onChange={handleChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>70℃</span>
          <span>100℃</span>
        </div>
        {errors.waterTemp && (
          <span className="error-text">{errors.waterTemp}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="ratio">
          粉水比：1:{formData.ratio.toFixed(1)} *
        </label>
        <input
          type="range"
          id="ratio"
          name="ratio"
          min="10"
          max="20"
          step="0.5"
          value={formData.ratio}
          onChange={handleChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>1:10</span>
          <span>1:20</span>
        </div>
        {errors.ratio && <span className="error-text">{errors.ratio}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="brewTime">冲煮时间（秒）*</label>
        <input
          type="number"
          id="brewTime"
          name="brewTime"
          min="1"
          max="300"
          value={formData.brewTime}
          onChange={handleChange}
        />
        {errors.brewTime && (
          <span className="error-text">{errors.brewTime}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="flavorRating">风味评分：{formData.flavorRating.toFixed(1)}</label>
        <input
          type="range"
          id="flavorRating"
          name="flavorRating"
          min="1"
          max="10"
          step="0.5"
          value={formData.flavorRating}
          onChange={handleChange}
          className="slider"
        />
        <div className="slider-labels">
          <span>1分</span>
          <span>10分</span>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="notes">备注</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="记录冲煮感受、风味描述等..."
          rows={4}
          maxLength={300}
        />
        <div className="char-count">
          {formData.notes.length}/300
        </div>
        {errors.notes && <span className="error-text">{errors.notes}</span>}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {initialData ? '更新配方' : '创建配方'}
        </button>
      </div>
    </form>
  );
};

export default RecipeForm;
