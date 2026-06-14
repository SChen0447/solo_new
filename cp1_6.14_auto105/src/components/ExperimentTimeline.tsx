import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  Scale,
  Flame,
  TrendingUp,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  X
} from 'lucide-react';
import type { BakingExperiment } from '../types';

interface ExperimentTimelineProps {
  experiments: BakingExperiment[];
  compareMode: boolean;
  selectedForCompare: string[];
  onToggleCompare: (id: string) => void;
  onImageClick: (url: string) => void;
}

function getBrowningLabel(score: number) {
  if (score <= 3) return { text: '浅色', color: '#F5DEB3' };
  if (score <= 6) return { text: '金黄', color: '#DAA520' };
  if (score <= 8) return { text: '金棕', color: '#B8860B' };
  return { text: '深褐', color: '#6F4E37' };
}

export function ExperimentTimeline({
  experiments,
  compareMode,
  selectedForCompare,
  onToggleCompare,
  onImageClick
}: ExperimentTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...experiments].sort((a, b) =>
    parseISO(b.bakingDate).getTime() - parseISO(a.bakingDate).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="empty-timeline">
        <Clock size={48} className="empty-icon" />
        <p>还没有烘焙实验记录</p>
        <span>创建第一条记录，开始您的烘焙之旅</span>
      </div>
    );
  }

  return (
    <div className="experiment-timeline">
      {compareMode && (
        <div className="compare-hint">
          <CheckCircle2 size={18} />
          <span>请选择 2 条记录进行对比 （{selectedForCompare.length}/2）</span>
          {selectedForCompare.length > 0 && (
            <button
              className="clear-compare"
              onClick={(e) => {
                e.stopPropagation();
                selectedForCompare.forEach(id => onToggleCompare(id));
              }}
            >
              <X size={14} /> 清除选择
            </button>
          )}
        </div>
      )}

      {sorted.map((exp, idx) => {
        const isExpanded = expandedId === exp.id;
        const isSelected = selectedForCompare.includes(exp.id);
        const browning = getBrowningLabel(exp.browningScore);

        return (
          <div
            key={exp.id}
            className={`timeline-item ${isExpanded ? 'expanded' : ''} ${
              isSelected ? 'selected' : ''
            } ${compareMode ? 'compare-mode' : ''}`}
            onClick={() => {
              if (compareMode) {
                onToggleCompare(exp.id);
              } else {
                setExpandedId(isExpanded ? null : exp.id);
              }
            }}
          >
            <div className="timeline-connector">
              <div className="connector-dot" />
              {idx < sorted.length - 1 && <div className="connector-line" />}
            </div>

            <div className="timeline-content">
              <div className="timeline-header">
                <div className="timeline-date">
                  <Clock size={14} />
                  <span>{format(parseISO(exp.bakingDate), 'yyyy年MM月dd日')}</span>
                </div>
                {compareMode && (
                  <div className={`compare-checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <CheckCircle2 size={18} />}
                  </div>
                )}
                {!compareMode && (
                  <button className="expand-btn">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>

              <div className="timeline-stats">
                <div className="stat-item">
                  <Scale size={14} />
                  <span>{exp.actualWeight}g</span>
                </div>
                <div className="stat-item">
                  <Flame size={14} style={{ color: browning.color }} />
                  <span style={{ color: browning.color }}>
                    焦化度 {exp.browningScore}/10 · {browning.text}
                  </span>
                </div>
                <div className="stat-item">
                  <TrendingUp size={14} />
                  <span>膨胀 {exp.riseUniformity}/10</span>
                </div>
                <div className="stat-item">
                  <DollarSign size={14} />
                  <span>¥{exp.actualCost.toFixed(2)}</span>
                </div>
              </div>

              {exp.photos.length > 0 && (
                <div className="timeline-photos">
                  {exp.photos.map((url, i) => (
                    <div
                      key={i}
                      className="photo-thumb"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(url);
                      }}
                    >
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        className="blur-load"
                      />
                      {i === exp.photos.length - 1 && i > 2 && (
                        <div className="photo-count">+{exp.photos.length - 3}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && (
                <div className="timeline-detail fade-in-up">
                  {exp.textureDescription && (
                    <div className="detail-section">
                      <div className="detail-label">
                        <FileText size={14} /> 组织切面描述
                      </div>
                      <p>{exp.textureDescription}</p>
                    </div>
                  )}
                  {exp.costNote && (
                    <div className="detail-section">
                      <div className="detail-label">
                        <DollarSign size={14} /> 成本备注
                      </div>
                      <p>{exp.costNote}</p>
                    </div>
                  )}
                  <div className="detail-scores">
                    <div className="score-bar">
                      <label>焦化度</label>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${exp.browningScore * 10}%`,
                            background: `linear-gradient(90deg, #F5DEB3, ${browning.color})`
                          }}
                        />
                      </div>
                      <span className="score-val">{exp.browningScore}</span>
                    </div>
                    <div className="score-bar">
                      <label>膨胀均匀度</label>
                      <div className="bar-track">
                        <div
                          className="bar-fill rise"
                          style={{ width: `${exp.riseUniformity * 10}%` }}
                        />
                      </div>
                      <span className="score-val">{exp.riseUniformity}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ExperimentTimeline;
