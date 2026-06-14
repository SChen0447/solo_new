import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Scale,
  Flame,
  TrendingUp,
  FileText,
  DollarSign,
  CalendarDays,
  ArrowRight,
  Percent,
  X,
  ZoomIn
} from 'lucide-react';
import type { BakingExperiment } from '../../types';
import { BarChart } from '../charts/BarChart';
import { RadarChart } from '../charts/RadarChart';

interface ComparePanelProps {
  expA: BakingExperiment;
  expB: BakingExperiment;
  onClose: () => void;
  onImageClick: (url: string) => void;
}

function calcDiff(a: number, b: number) {
  if (a === 0) return { diff: b - a, pct: 0 };
  const diff = b - a;
  const pct = (diff / Math.abs(a)) * 100;
  return { diff, pct };
}

export function ComparePanel({ expA, expB, onClose, onImageClick }: ComparePanelProps) {
  const costInfo = calcDiff(expA.actualCost, expB.actualCost);
  const browningInfo = calcDiff(expA.browningScore, expB.browningScore);
  const riseInfo = calcDiff(expA.riseUniformity, expB.riseUniformity);
  const weightInfo = calcDiff(expA.actualWeight, expB.actualWeight);

  const daysBetween = Math.abs(differenceInDays(parseISO(expA.bakingDate), parseISO(expB.bakingDate)));
  const [earlier, later] = parseISO(expA.bakingDate) < parseISO(expB.bakingDate)
    ? [expA, expB]
    : [expB, expA];

  return (
    <div className="compare-panel">
      <div className="compare-header">
        <div className="compare-title">
          <h2>
            <span className="label-a">实验 A</span>
            <ArrowRight size={20} className="compare-arrow" />
            <span className="label-b">实验 B</span>
          </h2>
          <div className="compare-meta">
            <CalendarDays size={14} />
            <span>
              间隔 {daysBetween} 天 · {format(parseISO(earlier.bakingDate), 'MM/dd')} →{' '}
              {format(parseISO(later.bakingDate), 'MM/dd')}
            </span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="compare-body">
        <div className="compare-summary">
          <div className="summary-card">
            <div className="summary-icon cost">
              <DollarSign size={20} />
            </div>
            <div className="summary-info">
              <span className="summary-label">成本变化</span>
              <span
                className={`summary-value ${costInfo.pct > 0 ? 'up' : costInfo.pct < 0 ? 'down' : ''}`}
              >
                {costInfo.pct > 0 ? '+' : ''}
                {costInfo.pct.toFixed(1)}%
                <Percent size={12} />
              </span>
            </div>
            <span className="summary-sub">
              ¥{expA.actualCost.toFixed(2)} → ¥{expB.actualCost.toFixed(2)}
            </span>
          </div>
          <div className="summary-card">
            <div className="summary-icon browning">
              <Flame size={20} />
            </div>
            <div className="summary-info">
              <span className="summary-label">焦化度变化</span>
              <span
                className={`summary-value ${browningInfo.pct > 0 ? 'up' : browningInfo.pct < 0 ? 'down' : ''}`}
              >
                {browningInfo.pct > 0 ? '+' : ''}
                {browningInfo.pct.toFixed(1)}%
              </span>
            </div>
            <span className="summary-sub">
              {expA.browningScore} → {expB.browningScore}
            </span>
          </div>
          <div className="summary-card">
            <div className="summary-icon rise">
              <TrendingUp size={20} />
            </div>
            <div className="summary-info">
              <span className="summary-label">膨胀均匀度</span>
              <span
                className={`summary-value ${riseInfo.pct > 0 ? 'up' : riseInfo.pct < 0 ? 'down' : ''}`}
              >
                {riseInfo.pct > 0 ? '+' : ''}
                {riseInfo.pct.toFixed(1)}%
              </span>
            </div>
            <span className="summary-sub">
              {expA.riseUniformity} → {expB.riseUniformity}
            </span>
          </div>
          <div className="summary-card">
            <div className="summary-icon weight">
              <Scale size={20} />
            </div>
            <div className="summary-info">
              <span className="summary-label">成品重量</span>
              <span
                className={`summary-value ${weightInfo.pct > 0 ? 'up' : weightInfo.pct < 0 ? 'down' : ''}`}
              >
                {weightInfo.pct > 0 ? '+' : ''}
                {weightInfo.pct.toFixed(1)}%
              </span>
            </div>
            <span className="summary-sub">
              {expA.actualWeight}g → {expB.actualWeight}g
            </span>
          </div>
        </div>

        <div className="compare-columns">
          <div className="compare-col col-a slide-in-left">
            <div className="col-header">
              <CalendarDays size={14} />
              <span>{format(parseISO(expA.bakingDate), 'yyyy年MM月dd日')}</span>
            </div>

            <div className="col-section">
              <h4>
                <Flame size={14} /> 焦化度对比
              </h4>
              <div className="dual-slider">
                <div className="slider-track">
                  <div
                    className="slider-fill-a"
                    style={{ width: `${expA.browningScore * 10}%` }}
                  />
                  <div className="slider-mid" />
                  <div
                    className="slider-fill-b"
                    style={{ width: `${expB.browningScore * 10}%` }}
                  />
                </div>
                <div className="slider-labels">
                  <span className="label-light">浅色 1</span>
                  <div className="diff-arrow">
                    {browningInfo.diff > 0 ? '↑' : browningInfo.diff < 0 ? '↓' : '='}
                    {browningInfo.diff !== 0 && ` ${Math.abs(browningInfo.diff)}`}
                  </div>
                  <span className="label-dark">深色 10</span>
                </div>
              </div>
            </div>

            <div className="col-section">
              <h4>
                <Scale size={14} /> 数据指标
              </h4>
              <div className="metric-grid">
                <div className="metric-item">
                  <span>成品重量</span>
                  <strong>{expA.actualWeight}g</strong>
                </div>
                <div className="metric-item">
                  <span>实际成本</span>
                  <strong>¥{expA.actualCost.toFixed(2)}</strong>
                </div>
                <div className="metric-item">
                  <span>焦化度</span>
                  <strong>{expA.browningScore}/10</strong>
                </div>
                <div className="metric-item">
                  <span>膨胀均匀度</span>
                  <strong>{expA.riseUniformity}/10</strong>
                </div>
              </div>
            </div>

            <div className="col-section">
              <h4>
                <FileText size={14} /> 组织切面
              </h4>
              <p className="texture-text">{expA.textureDescription || '无描述'}</p>
            </div>

            {expA.costNote && (
              <div className="col-section">
                <h4>
                  <DollarSign size={14} /> 成本备注
                </h4>
                <p className="texture-text">{expA.costNote}</p>
              </div>
            )}

            <div className="col-section">
              <h4>
                <ZoomIn size={14} /> 成品照片
              </h4>
              <div className="photo-grid">
                {expA.photos.length === 0 && <p className="no-photos">暂无照片</p>}
                {expA.photos.map((url, i) => (
                  <div key={i} className="photo-item" onClick={() => onImageClick(url)}>
                    <img src={url} alt="" loading="lazy" className="blur-load" />
                    <div className="photo-overlay">
                      <ZoomIn size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="compare-divider" />

          <div className="compare-col col-b slide-in-right">
            <div className="col-header">
              <CalendarDays size={14} />
              <span>{format(parseISO(expB.bakingDate), 'yyyy年MM月dd日')}</span>
            </div>

            <div className="col-section">
              <h4>
                <DollarSign size={14} /> 成本对比
              </h4>
              <BarChart
                labels={['实验 A', '实验 B']}
                values={[expA.actualCost, expB.actualCost]}
                colors={['#6F4E37', '#E67E22']}
                unit="元"
                height={180}
              />
            </div>

            <div className="col-section">
              <h4>
                <TrendingUp size={14} /> 综合指标雷达图
              </h4>
              <RadarChart
                labels={['焦化度', '膨胀均匀度', '重量达标', '成本效率', '成品质量']}
                datasets={[
                  {
                    label: '实验 A',
                    values: [
                      expA.browningScore,
                      expA.riseUniformity,
                      Math.min(10, Math.max(1, 10 - Math.abs(800 - expA.actualWeight) / 50)),
                      Math.min(10, Math.max(1, 15 - expA.actualCost / 5)),
                      (expA.browningScore + expA.riseUniformity) / 2
                    ],
                    color: '#6F4E37'
                  },
                  {
                    label: '实验 B',
                    values: [
                      expB.browningScore,
                      expB.riseUniformity,
                      Math.min(10, Math.max(1, 10 - Math.abs(800 - expB.actualWeight) / 50)),
                      Math.min(10, Math.max(1, 15 - expB.actualCost / 5)),
                      (expB.browningScore + expB.riseUniformity) / 2
                    ],
                    color: '#E67E22'
                  }
                ]}
              />
            </div>

            <div className="col-section">
              <h4>
                <Scale size={14} /> 数据指标
              </h4>
              <div className="metric-grid">
                <div className="metric-item">
                  <span>成品重量</span>
                  <strong>{expB.actualWeight}g</strong>
                </div>
                <div className="metric-item">
                  <span>实际成本</span>
                  <strong>¥{expB.actualCost.toFixed(2)}</strong>
                </div>
                <div className="metric-item">
                  <span>焦化度</span>
                  <strong>{expB.browningScore}/10</strong>
                </div>
                <div className="metric-item">
                  <span>膨胀均匀度</span>
                  <strong>{expB.riseUniformity}/10</strong>
                </div>
              </div>
            </div>

            <div className="col-section">
              <h4>
                <FileText size={14} /> 组织切面
              </h4>
              <p className="texture-text">{expB.textureDescription || '无描述'}</p>
            </div>

            {expB.costNote && (
              <div className="col-section">
                <h4>
                  <DollarSign size={14} /> 成本备注
                </h4>
                <p className="texture-text">{expB.costNote}</p>
              </div>
            )}

            <div className="col-section">
              <h4>
                <ZoomIn size={14} /> 成品照片
              </h4>
              <div className="photo-grid">
                {expB.photos.length === 0 && <p className="no-photos">暂无照片</p>}
                {expB.photos.map((url, i) => (
                  <div key={i} className="photo-item" onClick={() => onImageClick(url)}>
                    <img src={url} alt="" loading="lazy" className="blur-load" />
                    <div className="photo-overlay">
                      <ZoomIn size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComparePanel;
