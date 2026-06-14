import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAquariumStore } from '../store';
import type { TankType } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';

const AddTankModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const addTank = useAquariumStore((s) => s.addTank);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [type, setType] = useState<TankType>('freshwater');
  const [tempMin, setTempMin] = useState(24);
  const [tempMax, setTempMax] = useState(28);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTank({ name, capacity, type, tempMin, tempMax });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>添加新鱼缸</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>鱼缸名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="如：热带鱼缸" />
          </div>
          <div className="form-group">
            <label>容量（升）</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={1} required />
          </div>
          <div className="form-group">
            <label>类型</label>
            <select value={type} onChange={(e) => setType(e.target.value as TankType)}>
              <option value="freshwater">淡水</option>
              <option value="saltwater">海水</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>最低温度 (°C)</label>
              <input type="number" step="0.1" value={tempMin} onChange={(e) => setTempMin(Number(e.target.value))} required />
            </div>
            <div className="form-group">
              <label>最高温度 (°C)</label>
              <input type="number" step="0.1" value={tempMax} onChange={(e) => setTempMax(Number(e.target.value))} required />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn--primary">添加</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WaterRipple: React.FC<{ status: 'normal' | 'temp-high' | 'ammonia-high' }> = ({ status }) => {
  const statusClass = status === 'temp-high'
    ? 'ripple--orange'
    : status === 'ammonia-high'
    ? 'ripple--red'
    : 'ripple--blue';

  const animClass = status === 'temp-high'
    ? 'ripple-anim--flash'
    : status === 'ammonia-high'
    ? 'ripple-anim--shake'
    : 'ripple-anim--calm';

  return (
    <div className={`water-ripple ${statusClass} ${animClass}`}>
      <div className="ripple-wave ripple-wave-1" />
      <div className="ripple-wave ripple-wave-2" />
      <div className="ripple-wave ripple-wave-3" />
      <div className="ripple-center">
        {status === 'normal' && '🌊'}
        {status === 'temp-high' && '🔥'}
        {status === 'ammonia-high' && '⚠️'}
      </div>
    </div>
  );
};

const TankCard: React.FC<{ tank: ReturnType<typeof useAquariumStore.getState>['tanks'][0] }> = ({ tank }) => {
  const navigate = useNavigate();
  const getLatestReading = useAquariumStore((s) => s.getLatestReading);
  const getTankStatus = useAquariumStore((s) => s.getTankStatus);
  const latest = getLatestReading(tank.id);
  const status = getTankStatus(tank.id);

  const warnings: string[] = [];
  if (latest) {
    if (latest.temperature > tank.tempMax) warnings.push('温度过高');
    if (latest.ammonia > DEFAULT_THRESHOLDS.ammoniaMax) warnings.push('氨氮超标');
    if (latest.nitrite > DEFAULT_THRESHOLDS.nitriteMax) warnings.push('亚硝酸盐超标');
    if (latest.nitrate > DEFAULT_THRESHOLDS.nitrateMax) warnings.push('硝酸盐偏高');
    if (latest.ph < DEFAULT_THRESHOLDS.phMin || latest.ph > DEFAULT_THRESHOLDS.phMax) warnings.push('pH异常');
  }

  return (
    <div
      className={`tank-card tank-card--${status}`}
      onClick={() => navigate(`/tank/${tank.id}`)}
    >
      <div className="tank-card-header">
        <span className="tank-card-name">{tank.name}</span>
        <span className={`tank-type-badge tank-type-badge--${tank.type}`}>
          {tank.type === 'freshwater' ? '淡水' : '海水'}
        </span>
      </div>
      <WaterRipple status={status} />
      {warnings.length > 0 && (
        <div className="tank-card-warnings">
          {warnings.map((w, i) => (
            <span key={i} className="warning-tag">{w}</span>
          ))}
        </div>
      )}
      <div className="tank-card-summary">
        {latest ? (
          <>
            <div className="summary-item">
              <span className="summary-label">温度</span>
              <span className={`summary-value ${latest.temperature > tank.tempMax ? 'value--danger' : ''}`}>
                {latest.temperature}°C
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">pH</span>
              <span className={`summary-value ${latest.ph < DEFAULT_THRESHOLDS.phMin || latest.ph > DEFAULT_THRESHOLDS.phMax ? 'value--danger' : ''}`}>
                {latest.ph}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">氨氮</span>
              <span className={`summary-value ${latest.ammonia > DEFAULT_THRESHOLDS.ammoniaMax ? 'value--danger' : ''}`}>
                {latest.ammonia}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">硝酸盐</span>
              <span className={`summary-value ${latest.nitrate > DEFAULT_THRESHOLDS.nitrateMax ? 'value--danger' : ''}`}>
                {latest.nitrate}
              </span>
            </div>
          </>
        ) : (
          <div className="summary-empty">暂无检测数据</div>
        )}
      </div>
      <div className="tank-card-footer">
        <span>{tank.capacity}L</span>
        <span>{tank.fishGroups.reduce((sum, f) => sum + f.count, 0)}条鱼</span>
      </div>
    </div>
  );
};

const GlobalAlerts: React.FC = () => {
  const tanks = useAquariumStore((s) => s.tanks);
  const hasFedToday = useAquariumStore((s) => s.hasFedToday);
  const getDaysSinceLastWaterChange = useAquariumStore((s) => s.getDaysSinceLastWaterChange);
  const fetchFeedings = useAquariumStore((s) => s.fetchFeedings);
  const fetchWaterChanges = useAquariumStore((s) => s.fetchWaterChanges);

  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const newAlerts: string[] = [];
      for (const tank of tanks) {
        await fetchFeedings(tank.id);
        await fetchWaterChanges(tank.id);
        if (!hasFedToday(tank.id)) {
          newAlerts.push(`「${tank.name}」今天尚未喂食`);
        }
        const days = getDaysSinceLastWaterChange(tank.id);
        if (days !== null && days >= 7) {
          newAlerts.push(`「${tank.name}」距离上次换水已${days}天`);
        }
      }
      setAlerts(newAlerts);
    };
    if (tanks.length > 0) load();
  }, [tanks]);

  if (alerts.length === 0) return null;

  return (
    <div className="global-alerts">
      {alerts.map((alert, i) => (
        <div key={i} className="global-alert-item">
          <span className="global-alert-icon">🔔</span>
          {alert}
        </div>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const tanks = useAquariumStore((s) => s.tanks);
  const loading = useAquariumStore((s) => s.loading);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadRelated = async () => {
      const fetchReadings = useAquariumStore.getState().fetchReadings;
      const fetchFeedings = useAquariumStore.getState().fetchFeedings;
      const fetchWaterChanges = useAquariumStore.getState().fetchWaterChanges;
      for (const tank of tanks) {
        await Promise.all([
          fetchReadings(tank.id),
          fetchFeedings(tank.id),
          fetchWaterChanges(tank.id),
        ]);
      }
    };
    if (tanks.length > 0) loadRelated();
  }, [tanks.length]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="dashboard">
      <GlobalAlerts />
      <div className="dashboard-header">
        <h1>我的鱼缸</h1>
        <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
          + 添加鱼缸
        </button>
      </div>
      <div className="tank-grid">
        {tanks.map((tank) => (
          <TankCard key={tank.id} tank={tank} />
        ))}
      </div>
      {tanks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🐟</div>
          <p>还没有鱼缸，点击上方按钮添加你的第一个鱼缸吧！</p>
        </div>
      )}
      {showAddModal && <AddTankModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default Dashboard;
