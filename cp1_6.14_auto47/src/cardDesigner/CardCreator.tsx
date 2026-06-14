import { useState } from 'react';
import { useCardStore } from '../../store/useCardStore';
import type { CardType, CardEffect } from '../../types';
import './CardDesigner.css';

const CardCreator = () => {
  const { addCard, loading } = useCardStore();
  const [formData, setFormData] = useState({
    name: '',
    type: 'creature' as CardType,
    cost: 1,
    attack: 0,
    health: 0,
    effect: 'none' as CardEffect,
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cost' || name === 'attack' || name === 'health' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await addCard(formData);
    setFormData({
      name: '',
      type: 'creature',
      cost: 1,
      attack: 0,
      health: 0,
      effect: 'none',
      description: '',
    });
  };

  return (
    <div className="card-creator">
      <h2>卡牌设计</h2>
      <form onSubmit={handleSubmit} className="creator-form">
        <div className="form-group">
          <label htmlFor="name">卡牌名称</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="输入卡牌名称"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">卡牌类型</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="creature">生物</option>
              <option value="spell">法术</option>
              <option value="equipment">装备</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cost">能量消耗</label>
            <input
              type="number"
              id="cost"
              name="cost"
              min="1"
              max="10"
              value={formData.cost}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="attack">攻击力</label>
            <input
              type="number"
              id="attack"
              name="attack"
              min="0"
              value={formData.attack}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="health">生命值</label>
            <input
              type="number"
              id="health"
              name="health"
              min="0"
              value={formData.health}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="effect">特殊效果</label>
          <select
            id="effect"
            name="effect"
            value={formData.effect}
            onChange={handleChange}
          >
            <option value="none">无</option>
            <option value="doubleStrike">连击</option>
            <option value="lifesteal">吸血</option>
            <option value="shield">护盾</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">效果描述</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="描述卡牌效果..."
            rows={3}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? '创建中...' : '创建卡牌'}
        </button>
      </form>
    </div>
  );
};

export default CardCreator;
