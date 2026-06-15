import React from 'react';
import type { AnalysisResult, ElementData, ElementGroup } from './analyzer';

interface ReportProps {
  result: AnalysisResult | null;
  selectedElement: ElementData | null;
  onApplyCorrection: (groupId: string) => void;
  onExcludeElement: (elementId: string) => void;
}

function MiniBarChart({
  data,
  color,
  height = 60,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#BDBDBD',
          fontSize: 12,
        }}
      >
        暂无数据
      </div>
    );
  }

  const buckets = [0, 5, 10, 15, 20, 30, 50, 100];
  const counts = new Array(buckets.length).fill(0);

  data.forEach((v) => {
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (v >= buckets[i]) {
        counts[i]++;
        break;
      }
    }
  });

  const max = Math.max(...counts, 1);
  const width = 100;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
    >
      {counts.map((c, i) => {
        const barWidth = width / counts.length - 1;
        const barHeight = (c / max) * (height - 8);
        const x = i * (width / counts.length) + 0.5;
        const y = height - barHeight - 4;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={1.5}
              opacity={0.8}
            />
            <text
              x={x + barWidth / 2}
              y={height - 1}
              fontSize="6"
              fill="#9E9E9E"
              textAnchor="middle"
            >
              {buckets[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreBadge({ value }: { value: number }) {
  let cls = 'good';
  if (value >= 70 && value < 85) cls = 'warning';
  if (value < 70) cls = 'danger';
  return (
    <span className={`deviation-badge ${cls}`}>
      {value.toFixed(1)}px
    </span>
  );
}

const Report: React.FC<ReportProps> = ({
  result,
  selectedElement,
  onApplyCorrection,
  onExcludeElement,
}) => {
  if (!result) {
    return (
      <div className="no-data">
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📊</div>
        <div>上传图片后将在此处显示分析报告</div>
      </div>
    );
  }

  const scoreClass =
    result.overallScore >= 85 ? 'good' : result.overallScore >= 70 ? 'warning' : 'danger';

  const getNearestNeighbor = (el: ElementData): { el: ElementData | null; hDev: number; vDev: number } => {
    let nearest: ElementData | null = null;
    let minDist = Infinity;
    let hDev = 0;
    let vDev = 0;
    result.elements.forEach((other) => {
      if (other.id === el.id || other.excluded) return;
      const dx = other.centerX - el.centerX;
      const dy = other.centerY - el.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
        hDev = Math.abs(other.bbox.x - el.bbox.x);
        vDev = Math.abs(other.bbox.y - el.bbox.y);
      }
    });
    return { el: nearest, hDev, vDev };
  };

  return (
    <>
      <div className="control-card">
        <div className="score-section">
          <div className={`score-circle ${scoreClass}`}>
            <span className="score-value">{result.overallScore}</span>
            <span className="score-label">一致性分数</span>
          </div>
          <div className="score-details">
            {result.overallScore < 70 && (
              <div style={{ marginBottom: 8 }}>
                <span className="warning-badge">⚠️ 布局偏差较大</span>
              </div>
            )}
            <div className="score-detail-item">
              <span>水平对齐</span>
              <strong>{result.horizontalScore}分</strong>
            </div>
            <div className="score-detail-item">
              <span>垂直对齐</span>
              <strong>{result.verticalScore}分</strong>
            </div>
            <div className="score-detail-item">
              <span>间距一致性</span>
              <strong>{result.spacingScore}分</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="control-card">
        <div className="control-card-header">📈 元素统计</div>
        <div className="control-card-body">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{result.totalElements}</div>
              <div className="stat-label">检测到元素</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: COLORS.GREEN }}>
                {result.alignedWell}
              </div>
              <div className="stat-label">对齐良好</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: COLORS.YELLOW }}>
                {result.warnings}
              </div>
              <div className="stat-label">轻微偏差</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: COLORS.RED }}>
                {result.errors}
              </div>
              <div className="stat-label">严重偏差</div>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: '#757575',
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              水平偏差分布 (px)
            </div>
            <MiniBarChart data={result.horizontalDeviations} color="#2196F3" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: '#757575',
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              垂直偏差分布 (px)
            </div>
            <MiniBarChart data={result.verticalDeviations} color="#FF9800" />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#757575',
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              间距分布 (px)
            </div>
            <MiniBarChart data={result.spacingDeviations} color="#9C27B0" />
          </div>
        </div>
      </div>

      {selectedElement && (
        <div className="element-info-card">
          <div className="element-info-header">🔍 {selectedElement.name}</div>
          <div className="element-info-body">
            <div className="info-row">
              <span className="info-label">宽度 × 高度</span>
              <span className="info-value">
                {Math.round(selectedElement.bbox.width)} × {Math.round(selectedElement.bbox.height)} px
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">位置 (X, Y)</span>
              <span className="info-value">
                ({Math.round(selectedElement.bbox.x)}, {Math.round(selectedElement.bbox.y)})
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">中心坐标</span>
              <span className="info-value">
                ({Math.round(selectedElement.centerX)}, {Math.round(selectedElement.centerY)})
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">水平偏差</span>
              <ScoreBadge value={selectedElement.horizontalDeviation} />
            </div>
            <div className="info-row">
              <span className="info-label">垂直偏差</span>
              <ScoreBadge value={selectedElement.verticalDeviation} />
            </div>
            <div className="info-row">
              <span className="info-label">间距偏差</span>
              <ScoreBadge value={selectedElement.spacingDeviation} />
            </div>
            <div className="info-row">
              <span className="info-label">最大偏差</span>
              <ScoreBadge value={selectedElement.maxDeviation} />
            </div>
            {(() => {
              const nn = getNearestNeighbor(selectedElement);
              if (!nn.el) return null;
              return (
                <div className="info-row">
                  <span className="info-label">最近元素</span>
                  <span className="info-value" style={{ fontSize: 12 }}>
                    {nn.el.name}
                  </span>
                </div>
              );
            })()}
            {(() => {
              const nn = getNearestNeighbor(selectedElement);
              if (!nn.el) return null;
              return (
                <div className="info-row">
                  <span className="info-label">相邻 H / V 偏差</span>
                  <span className="info-value" style={{ fontSize: 12 }}>
                    {nn.hDev.toFixed(0)} / {nn.vDev.toFixed(0)} px
                  </span>
                </div>
              );
            })()}
            {!selectedElement.excluded && (
              <button
                className="btn btn-danger exclude-btn"
                onClick={() => onExcludeElement(selectedElement.id)}
              >
                🚫 排除此元素
              </button>
            )}
          </div>
        </div>
      )}

      <div className="control-card">
        <div className="control-card-header">🗂️ 分组与智能建议</div>
        <div className="control-card-body">
          {result.groups.length === 0 ? (
            <div
              style={{
                padding: '20px 0',
                textAlign: 'center',
                color: '#9E9E9E',
                fontSize: 13,
              }}
            >
              暂未识别到可分组的元素集合
            </div>
          ) : (
            result.groups.map((group, idx) => (
              <GroupPanel
                key={group.id}
                group={group}
                elements={result.elements.filter((e) => group.elementIds.includes(e.id))}
                index={idx}
                onApply={() => onApplyCorrection(group.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="control-card">
        <div className="control-card-header">📋 偏差明细</div>
        <div className="control-card-body" style={{ padding: 0 }}>
          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>元素</th>
                  <th>宽×高</th>
                  <th>H偏差</th>
                  <th>V偏差</th>
                </tr>
              </thead>
              <tbody>
                {result.elements
                  .filter((e) => !e.excluded)
                  .sort((a, b) => b.maxDeviation - a.maxDeviation)
                  .slice(0, 30)
                  .map((el) => (
                    <tr key={el.id}>
                      <td style={{ fontWeight: 500, color: '#424242' }}>
                        {el.name}
                      </td>
                      <td>
                        {Math.round(el.bbox.width)}×{Math.round(el.bbox.height)}
                      </td>
                      <td>
                        <ScoreBadge value={el.horizontalDeviation} />
                      </td>
                      <td>
                        <ScoreBadge value={el.verticalDeviation} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="control-card">
        <div className="control-card-header">🏷️ 颜色图例</div>
        <div className="control-card-body">
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color green"></div>
              <span>偏差＜5px 良好</span>
            </div>
            <div className="legend-item">
              <div className="legend-color yellow"></div>
              <span>偏差5~15px 警告</span>
            </div>
            <div className="legend-item">
              <div className="legend-color red"></div>
              <span>偏差＞15px 严重</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const COLORS = {
  GREEN: '#4CAF50',
  YELLOW: '#FFC107',
  RED: '#F44336',
};

const GroupPanel: React.FC<{
  group: ElementGroup;
  elements: ElementData[];
  index: number;
  onApply: () => void;
}> = ({ group, elements, index, onApply }) => {
  const [expanded, setExpanded] = React.useState(index < 2);

  const avgWidth = Math.round(
    elements.reduce((s, e) => s + e.bbox.width, 0) / Math.max(1, elements.length)
  );
  const avgHeight = Math.round(
    elements.reduce((s, e) => s + e.bbox.height, 0) / Math.max(1, elements.length)
  );

  return (
    <div className="group-item" style={{ borderColor: group.color }}>
      <div
        className="group-header"
        style={{ background: group.corrected ? '#E8F5E9' : group.color + '33' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div
            className="group-color-tag"
            style={{ background: group.color, border: `2px solid ${group.color}` }}
          ></div>
          <span className="group-name">
            {group.name}
            {group.corrected && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: '#2E7D32',
                  background: '#C8E6C9',
                  padding: '1px 6px',
                  borderRadius: 8,
                }}
              >
                ✓ 已修正
              </span>
            )}
          </span>
        </div>
        <span className="group-count">{elements.length} 个元素</span>
        <span
          style={{
            marginLeft: 10,
            fontSize: 12,
            color: '#757575',
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
      </div>
      {expanded && (
        <div className="group-body">
          <div className="group-suggestion">💡 {group.suggestion}</div>
          <div className="group-stats">
            <span>
              平均宽：<strong>{avgWidth}px</strong>
            </span>
            <span>
              平均高：<strong>{avgHeight}px</strong>
            </span>
            <span>
              H偏差：<strong>{group.avgHorizontalDeviation.toFixed(1)}px</strong>
            </span>
            <span>
              V偏差：<strong>{group.avgVerticalDeviation.toFixed(1)}px</strong>
            </span>
          </div>
          {!group.corrected && (
            <button
              className="btn btn-success apply-btn"
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
            >
              ✨ 一键应用修正
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Report;
