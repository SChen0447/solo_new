import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useAquariumStore } from '../store';
import type { FeedType } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';

const tabList = [
  { key: 'overview', label: '概览' },
  { key: 'readings', label: '水质检测' },
  { key: 'logs', label: '喂食与换水' },
] as const;

type TabKey = typeof tabList[number]['key'];

const AddReadingForm: React.FC<{ tankId: string; onClose: () => void }> = ({ tankId, onClose }) => {
  const addReading = useAquariumStore((s) => s.addReading);
  const tank = useAquariumStore((s) => s.tanks.find((t) => t.id === tankId));
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    temperature: 25,
    ph: 7.0,
    ammonia: 0,
    nitrite: 0,
    nitrate: 0,
    hardness: 8,
  });
  const [warnings, setWarnings] = useState<string[]>([]);

  const checkWarnings = useCallback((data: typeof form) => {
    const w: string[] = [];
    if (tank && data.temperature > tank.tempMax) w.push(`温度超过上限${tank.tempMax}°C，鱼类可能热应激`);
    if (data.ammonia > DEFAULT_THRESHOLDS.ammoniaMax) w.push(`氨氮超过安全阈值${DEFAULT_THRESHOLDS.ammoniaMax}mg/L，有中毒风险`);
    if (data.nitrite > DEFAULT_THRESHOLDS.nitriteMax) w.push(`亚硝酸盐超过安全阈值${DEFAULT_THRESHOLDS.nitriteMax}mg/L`);
    if (data.nitrate > DEFAULT_THRESHOLDS.nitrateMax) w.push(`硝酸盐超过安全阈值${DEFAULT_THRESHOLDS.nitrateMax}mg/L，建议换水`);
    if (data.ph < DEFAULT_THRESHOLDS.phMin) w.push(`pH低于下限${DEFAULT_THRESHOLDS.phMin}，水质偏酸`);
    if (data.ph > DEFAULT_THRESHOLDS.phMax) w.push(`pH高于上限${DEFAULT_THRESHOLDS.phMax}，水质偏碱`);
    if (data.hardness < DEFAULT_THRESHOLDS.hardnessMin) w.push(`硬度过低${DEFAULT_THRESHOLDS.hardnessMin}dGH`);
    if (data.hardness > DEFAULT_THRESHOLDS.hardnessMax) w.push(`硬度过高${DEFAULT_THRESHOLDS.hardnessMax}dGH`);
    return w;
  }, [tank]);

  const handleChange = (field: string, value: number) => {
    const newData = { ...form, [field]: value };
    setForm(newData);
    setWarnings(checkWarnings(newData));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addReading(tankId, form);
    onClose();
  };

  const isWarning = (field: string) => {
    return warnings.some((w) => {
      const map: Record<string, string> = {
        temperature: '温度', ph: 'pH', ammonia: '氨氮',
        nitrite: '亚硝酸盐', nitrate: '硝酸盐', hardness: '硬度',
      };
      return w.includes(map[field] || '');
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <h2>添加水质检测记录</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>检测日期</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>温度 (°C)</label>
              <div className="input-with-icon">
                <input type="number" step="0.1" value={form.temperature} onChange={(e) => handleChange('temperature', Number(e.target.value))} required />
                {isWarning('temperature') && <span className="input-warning" title="温度异常">⚠️</span>}
              </div>
            </div>
            <div className="form-group">
              <label>pH值</label>
              <div className="input-with-icon">
                <input type="number" step="0.1" value={form.ph} onChange={(e) => handleChange('ph', Number(e.target.value))} required />
                {isWarning('ph') && <span className="input-warning" title="pH异常">⚠️</span>}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>氨氮 (mg/L)</label>
              <div className="input-with-icon">
                <input type="number" step="0.01" value={form.ammonia} onChange={(e) => handleChange('ammonia', Number(e.target.value))} required />
                {isWarning('ammonia') && <span className="input-warning" title="氨氮超标">⚠️</span>}
              </div>
            </div>
            <div className="form-group">
              <label>亚硝酸盐 (mg/L)</label>
              <div className="input-with-icon">
                <input type="number" step="0.01" value={form.nitrite} onChange={(e) => handleChange('nitrite', Number(e.target.value))} required />
                {isWarning('nitrite') && <span className="input-warning" title="亚硝酸盐超标">⚠️</span>}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>硝酸盐 (mg/L)</label>
              <div className="input-with-icon">
                <input type="number" step="0.1" value={form.nitrate} onChange={(e) => handleChange('nitrate', Number(e.target.value))} required />
                {isWarning('nitrate') && <span className="input-warning" title="硝酸盐偏高">⚠️</span>}
              </div>
            </div>
            <div className="form-group">
              <label>硬度 (dGH)</label>
              <div className="input-with-icon">
                <input type="number" step="0.1" value={form.hardness} onChange={(e) => handleChange('hardness', Number(e.target.value))} required />
                {isWarning('hardness') && <span className="input-warning" title="硬度异常">⚠️</span>}
              </div>
            </div>
          </div>
          {warnings.length > 0 && (
            <div className="reading-warnings">
              {warnings.map((w, i) => (
                <div key={i} className="reading-warning-item">⚠️ {w}</div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn--primary">提交</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddFeedingForm: React.FC<{ tankId: string; onClose: () => void }> = ({ tankId, onClose }) => {
  const addFeeding = useAquariumStore((s) => s.addFeeding);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    feedType: 'flake' as FeedType,
    amount: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFeeding(tankId, form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>记录喂食</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日期</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>饲料类型</label>
            <select value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value as FeedType })}>
              <option value="flake">薄片</option>
              <option value="pellet">颗粒</option>
              <option value="freeze-dried">冻干</option>
            </select>
          </div>
          <div className="form-group">
            <label>喂食量（克）</label>
            <input type="number" step="0.1" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} min={0.1} required />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn--primary">提交</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddWaterChangeForm: React.FC<{ tankId: string; onClose: () => void }> = ({ tankId, onClose }) => {
  const addWaterChange = useAquariumStore((s) => s.addWaterChange);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    volume: 25,
    addedStabilizer: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addWaterChange(tankId, form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>记录换水</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日期</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>换水量（升）</label>
            <input type="number" step="0.5" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} min={0.5} required />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.addedStabilizer} onChange={(e) => setForm({ ...form, addedStabilizer: e.target.checked })} />
              添加了水质稳定剂
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn--primary">提交</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddFishForm: React.FC<{ tankId: string; onClose: () => void }> = ({ tankId, onClose }) => {
  const addFishGroup = useAquariumStore((s) => s.addFishGroup);
  const [form, setForm] = useState({ species: '', count: 1, notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFishGroup(tankId, form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>添加鱼群</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>种类</label>
            <input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} required placeholder="如：孔雀鱼" />
          </div>
          <div className="form-group">
            <label>数量</label>
            <input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} min={1} required />
          </div>
          <div className="form-group">
            <label>备注</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="可选" />
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

const TankDetail: React.FC = () => {
  const { tankId } = useParams<{ tankId: string }>();
  const navigate = useNavigate();
  const tank = useAquariumStore((s) => s.tanks.find((t) => t.id === tankId));
  const readings = useAquariumStore((s) => s.readings[tankId || ''] || []);
  const feedings = useAquariumStore((s) => s.feedings[tankId || ''] || []);
  const waterChanges = useAquariumStore((s) => s.waterChanges[tankId || ''] || []);
  const fetchReadings = useAquariumStore((s) => s.fetchReadings);
  const fetchFeedings = useAquariumStore((s) => s.fetchFeedings);
  const fetchWaterChanges = useAquariumStore((s) => s.fetchWaterChanges);
  const deleteTank = useAquariumStore((s) => s.deleteTank);
  const removeFishGroup = useAquariumStore((s) => s.removeFishGroup);
  const getTankStatus = useAquariumStore((s) => s.getTankStatus);
  const getDaysSinceLastWaterChange = useAquariumStore((s) => s.getDaysSinceLastWaterChange);
  const hasFedToday = useAquariumStore((s) => s.hasFedToday);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showAddReading, setShowAddReading] = useState(false);
  const [showAddFeeding, setShowAddFeeding] = useState(false);
  const [showAddWaterChange, setShowAddWaterChange] = useState(false);
  const [showAddFish, setShowAddFish] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (tankId) {
      fetchReadings(tankId);
      fetchFeedings(tankId);
      fetchWaterChanges(tankId);
    }
  }, [tankId, fetchReadings, fetchFeedings, fetchWaterChanges]);

  if (!tank) {
    return <div className="loading">鱼缸不存在</div>;
  }

  const status = getTankStatus(tank.id);
  const daysSinceWaterChange = getDaysSinceLastWaterChange(tank.id);
  const fedToday = hasFedToday(tank.id);

  const chartData = [...readings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(parseISO(r.date), 'MM/dd'),
      temperature: r.temperature,
      ph: r.ph,
      ammonia: r.ammonia,
      nitrate: r.nitrate,
    }));

  const sortedReadings = [...readings].sort((a, b) =>
    sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  const allLogs = [
    ...feedings.map((f) => ({ ...f, logType: 'feeding' as const })),
    ...waterChanges.map((w) => ({ ...w, logType: 'water-change' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const isRecent = (dateStr: string) => {
    const d = parseISO(dateStr);
    return differenceInDays(new Date(), d) <= 7;
  };

  const exportCSV = () => {
    const headers = ['日期', '温度(°C)', 'pH', '氨氮(mg/L)', '亚硝酸盐(mg/L)', '硝酸盐(mg/L)', '硬度(dGH)'];
    const rows = sortedReadings.map((r) =>
      [r.date, r.temperature, r.ph, r.ammonia, r.nitrite, r.nitrate, r.hardness].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tank.name}_水质记录.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTank = async () => {
    if (window.confirm(`确定删除「${tank.name}」？此操作不可撤销。`)) {
      await deleteTank(tank.id);
      navigate('/');
    }
  };

  return (
    <div className="tank-detail">
      <div className="detail-header">
        <button className="btn btn--ghost" onClick={() => navigate('/')}>← 返回</button>
        <div className="detail-title-area">
          <h1>{tank.name}</h1>
          <span className={`tank-type-badge tank-type-badge--${tank.type}`}>
            {tank.type === 'freshwater' ? '淡水' : '海水'}
          </span>
          {status !== 'normal' && (
            <span className="status-badge status-badge--danger">
              {status === 'temp-high' ? '🔥 温度过高' : '⚠️ 氨氮超标'}
            </span>
          )}
        </div>
        <button className="btn btn--danger btn--sm" onClick={handleDeleteTank}>删除鱼缸</button>
      </div>

      <div className="detail-alerts">
        {!fedToday && (
          <div className="detail-alert detail-alert--warning">🔔 今天尚未喂食</div>
        )}
        {daysSinceWaterChange !== null && daysSinceWaterChange >= 7 && (
          <div className="detail-alert detail-alert--info">💧 距离上次换水已{daysSinceWaterChange}天</div>
        )}
      </div>

      <div className="tab-bar">
        {tabList.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'tab-item--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="section">
            <div className="section-header">
              <h2>鱼群</h2>
              <button className="btn btn--primary btn--sm" onClick={() => setShowAddFish(true)}>+ 添加鱼群</button>
            </div>
            {tank.fishGroups.length === 0 ? (
              <p className="empty-text">暂无鱼群记录</p>
            ) : (
              <div className="fish-list">
                {tank.fishGroups.map((fish) => (
                  <div key={fish.id} className="fish-item">
                    <div className="fish-info">
                      <span className="fish-species">{fish.species}</span>
                      <span className="fish-count">{fish.count}条</span>
                      {fish.notes && <span className="fish-notes">{fish.notes}</span>}
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => removeFishGroup(tank.id, fish.id)}
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section">
            <h2>基本信息</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">容量</span>
                <span className="info-value">{tank.capacity}L</span>
              </div>
              <div className="info-item">
                <span className="info-label">温度范围</span>
                <span className="info-value">{tank.tempMin}°C ~ {tank.tempMax}°C</span>
              </div>
              <div className="info-item">
                <span className="info-label">鱼群总数</span>
                <span className="info-value">{tank.fishGroups.reduce((s, f) => s + f.count, 0)}条</span>
              </div>
              <div className="info-item">
                <span className="info-label">最近检测</span>
                <span className="info-value">
                  {readings.length > 0
                    ? format(parseISO([...readings].sort((a, b) => b.date.localeCompare(a.date))[0].date), 'yyyy-MM-dd')
                    : '无'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'readings' && (
        <div className="tab-content">
          <div className="section">
            <div className="section-header">
              <h2>水质趋势</h2>
              <div className="section-actions">
                <button className="btn btn--primary btn--sm" onClick={() => setShowAddReading(true)}>+ 添加检测</button>
                {readings.length > 0 && (
                  <button className="btn btn--secondary btn--sm" onClick={exportCSV}>导出CSV</button>
                )}
              </div>
            </div>
            {chartData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.96)',
                        border: '1px solid #d0dce8',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="temperature" name="温度(°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="ph" name="pH" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="ammonia" name="氨氮(mg/L)" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="nitrate" name="硝酸盐(mg/L)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty-text">暂无检测数据，点击"添加检测"开始记录</p>
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <h2>检测记录</h2>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                {sortOrder === 'desc' ? '↓ 最新优先' : '↑ 最早优先'}
              </button>
            </div>
            {sortedReadings.length > 0 ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>温度</th>
                      <th>pH</th>
                      <th>氨氮</th>
                      <th>亚硝酸盐</th>
                      <th>硝酸盐</th>
                      <th>硬度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReadings.map((r) => {
                      const rowWarnings: string[] = [];
                      if (r.temperature > tank.tempMax) rowWarnings.push('温度过高');
                      if (r.ammonia > DEFAULT_THRESHOLDS.ammoniaMax) rowWarnings.push('氨氮超标');
                      return (
                        <tr key={r.id} className={rowWarnings.length > 0 ? 'row--warning' : ''}>
                          <td>{r.date}</td>
                          <td className={r.temperature > tank.tempMax ? 'value--danger' : ''}>{r.temperature}°C</td>
                          <td className={r.ph < DEFAULT_THRESHOLDS.phMin || r.ph > DEFAULT_THRESHOLDS.phMax ? 'value--danger' : ''}>{r.ph}</td>
                          <td className={r.ammonia > DEFAULT_THRESHOLDS.ammoniaMax ? 'value--danger' : ''}>{r.ammonia}</td>
                          <td className={r.nitrite > DEFAULT_THRESHOLDS.nitriteMax ? 'value--danger' : ''}>{r.nitrite}</td>
                          <td className={r.nitrate > DEFAULT_THRESHOLDS.nitrateMax ? 'value--danger' : ''}>{r.nitrate}</td>
                          <td className={r.hardness < DEFAULT_THRESHOLDS.hardnessMin || r.hardness > DEFAULT_THRESHOLDS.hardnessMax ? 'value--danger' : ''}>{r.hardness}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-text">暂无记录</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="tab-content">
          <div className="section">
            <div className="section-header">
              <h2>喂食与换水日志</h2>
              <div className="section-actions">
                <button className="btn btn--primary btn--sm" onClick={() => setShowAddFeeding(true)}>+ 喂食</button>
                <button className="btn btn--primary btn--sm" onClick={() => setShowAddWaterChange(true)}>+ 换水</button>
              </div>
            </div>
            {allLogs.length > 0 ? (
              <div className="log-list">
                {allLogs.map((log) => {
                  const recent = isRecent(log.date);
                  if (log.logType === 'feeding') {
                    const f = log as typeof feedings[0] & { logType: 'feeding' };
                    return (
                      <div key={f.id} className={`log-item ${recent ? 'log-item--recent' : 'log-item--old'}`}>
                        <div className="log-icon">🍽️</div>
                        <div className="log-content">
                          <div className="log-title">
                            喂食 · {f.feedType === 'flake' ? '薄片' : f.feedType === 'pellet' ? '颗粒' : '冻干'}
                          </div>
                          <div className="log-meta">{f.amount}克 · {f.date}</div>
                        </div>
                      </div>
                    );
                  } else {
                    const w = log as typeof waterChanges[0] & { logType: 'water-change' };
                    return (
                      <div key={w.id} className={`log-item ${recent ? 'log-item--recent' : 'log-item--old'}`}>
                        <div className="log-icon">💧</div>
                        <div className="log-content">
                          <div className="log-title">
                            换水 · {w.volume}升
                            {w.addedStabilizer && <span className="log-badge">已加稳定剂</span>}
                          </div>
                          <div className="log-meta">{w.date}</div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <p className="empty-text">暂无日志记录</p>
            )}
          </div>
        </div>
      )}

      {showAddReading && <AddReadingForm tankId={tank.id} onClose={() => setShowAddReading(false)} />}
      {showAddFeeding && <AddFeedingForm tankId={tank.id} onClose={() => setShowAddFeeding(false)} />}
      {showAddWaterChange && <AddWaterChangeForm tankId={tank.id} onClose={() => setShowAddWaterChange(false)} />}
      {showAddFish && <AddFishForm tankId={tank.id} onClose={() => setShowAddFish(false)} />}
    </div>
  );
};

export default TankDetail;
