import { useMemo, useState } from 'react';
import type { ParseResult, Requirement } from '../types';

interface DiffViewProps {
  history: ParseResult[];
  onClose: () => void;
  onApply?: (result: ParseResult) => void;
}

type DiffType = 'added' | 'removed' | 'modified' | 'same';

interface DiffItem {
  type: DiffType;
  left?: Requirement;
  right?: Requirement;
  changedFields?: string[];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeDiff(left: Requirement[], right: Requirement[]): DiffItem[] {
  const leftByTitle = new Map(left.map(r => [r.title, r]));
  const rightByTitle = new Map(right.map(r => [r.title, r]));

  const allTitles = new Set([...leftByTitle.keys(), ...rightByTitle.keys()]);
  const items: DiffItem[] = [];

  for (const title of allTitles) {
    const l = leftByTitle.get(title);
    const r = rightByTitle.get(title);

    if (l && r) {
      const changedFields: string[] = [];
      if (l.description !== r.description) changedFields.push('描述');
      if (l.priority !== r.priority) changedFields.push('优先级');
      if (l.type !== r.type) changedFields.push('类型');
      const lDepKey = [...l.dependencies].sort().join(',');
      const rDepKey = [...r.dependencies].sort().join(',');
      if (lDepKey !== rDepKey) changedFields.push('依赖');

      if (changedFields.length > 0) {
        items.push({ type: 'modified', left: l, right: r, changedFields });
      } else {
        items.push({ type: 'same', left: l, right: r });
      }
    } else if (!l && r) {
      items.push({ type: 'added', right: r });
    } else if (l && !r) {
      items.push({ type: 'removed', left: l });
    }
  }

  return items.sort((a, b) => {
    const order = { added: 0, removed: 1, modified: 2, same: 3 };
    return order[a.type] - order[b.type];
  });
}

function FieldDiff({
  label,
  left,
  right,
  changed
}: {
  label: string;
  left?: string;
  right?: string;
  changed: boolean;
}) {
  if (!changed) {
    return (
      <div className="diff-field">
        <span className="diff-field-label">{label}:</span>
        <span className="diff-field-value">{left}</span>
      </div>
    );
  }
  return (
    <div className="diff-field diff-field-changed">
      <span className="diff-field-label">{label}:</span>
      <div className="diff-field-values">
        {left && <span className="diff-old">{left}</span>}
        <span className="diff-arrow">→</span>
        {right && <span className="diff-new">{right}</span>}
      </div>
    </div>
  );
}

export default function DiffView({ history, onClose, onApply }: DiffViewProps) {
  const [leftId, setLeftId] = useState<string>(history[0]?.id || '');
  const [rightId, setRightId] = useState<string>(history[1]?.id || '');

  const leftResult = useMemo(() => history.find(h => h.id === leftId), [history, leftId]);
  const rightResult = useMemo(() => history.find(h => h.id === rightId), [history, rightId]);

  const diffItems = useMemo(() => {
    if (!leftResult || !rightResult) return [];
    return computeDiff(leftResult.requirements, rightResult.requirements);
  }, [leftResult, rightResult]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0, same = 0;
    for (const item of diffItems) {
      if (item.type === 'added') added++;
      else if (item.type === 'removed') removed++;
      else if (item.type === 'modified') modified++;
      else same++;
    }
    return { added, removed, modified, same };
  }, [diffItems]);

  const renderItemSide = (req: Requirement | undefined, side: 'left' | 'right', type: DiffType, changedFields?: string[]) => {
    if (!req) {
      return <div className="diff-empty">—</div>;
    }
    const fieldChanged = (field: string) => changedFields?.includes(field) || false;
    return (
      <div className={`diff-req diff-type-${type}`}>
        <div className="diff-req-header">
          <span className="diff-req-number">REQ-{req.number}</span>
          <span className={`diff-req-type ${req.type === '功能' ? 'type-func' : 'type-nonfunc'}`}>
            {req.type}
          </span>
          <span className={`priority-badge priority-${req.priority === '高' ? 'high' : req.priority === '中' ? 'mid' : 'low'}`}>
            {req.priority}优
          </span>
        </div>
        <div className="diff-req-body">
          <FieldDiff
            label="标题"
            left={side === 'left' ? req.title : req.title}
            right={side === 'right' ? req.title : req.title}
            changed={false}
          />
          <FieldDiff
            label="描述"
            left={req.description}
            right={req.description}
            changed={fieldChanged('描述')}
          />
          <FieldDiff
            label="优先级"
            left={req.priority}
            right={req.priority}
            changed={fieldChanged('优先级')}
          />
          <FieldDiff
            label="类型"
            left={req.type}
            right={req.type}
            changed={fieldChanged('类型')}
          />
        </div>
      </div>
    );
  };

  const renderDiffRow = (item: DiffItem, idx: number) => {
    switch (item.type) {
      case 'added':
        return (
          <div key={idx} className="diff-row diff-added">
            <div className="diff-side">{renderItemSide(undefined, 'left', 'added')}</div>
            <div className="diff-divider">
              <span className="diff-type-label diff-label-added">+ 新增</span>
            </div>
            <div className="diff-side">{renderItemSide(item.right, 'right', 'added')}</div>
          </div>
        );
      case 'removed':
        return (
          <div key={idx} className="diff-row diff-removed">
            <div className="diff-side">{renderItemSide(item.left, 'left', 'removed')}</div>
            <div className="diff-divider">
              <span className="diff-type-label diff-label-removed">− 删除</span>
            </div>
            <div className="diff-side">{renderItemSide(undefined, 'right', 'removed')}</div>
          </div>
        );
      case 'modified':
        return (
          <div key={idx} className="diff-row diff-modified">
            <div className="diff-side">{renderItemSide(item.left, 'left', 'modified', item.changedFields)}</div>
            <div className="diff-divider">
              <span className="diff-type-label diff-label-modified">~ 修改</span>
              {item.changedFields && item.changedFields.length > 0 && (
                <div className="diff-changed-fields">
                  {item.changedFields.join(', ')}
                </div>
              )}
            </div>
            <div className="diff-side">{renderItemSide(item.right, 'right', 'modified', item.changedFields)}</div>
          </div>
        );
      case 'same':
      default:
        return (
          <div key={idx} className="diff-row diff-same">
            <div className="diff-side">{renderItemSide(item.left, 'left', 'same')}</div>
            <div className="diff-divider">
              <span className="diff-type-label diff-label-same">= 相同</span>
            </div>
            <div className="diff-side">{renderItemSide(item.right, 'right', 'same')}</div>
          </div>
        );
    }
  };

  return (
    <div className="diff-view">
      <div className="diff-header">
        <button className="btn btn-secondary ripple" onClick={onClose}>
          ← 返回列表
        </button>
        <h2>需求对比视图</h2>
        <div className="diff-stats">
          <span className="stat stat-added">+{stats.added}</span>
          <span className="stat stat-removed">−{stats.removed}</span>
          <span className="stat stat-modified">~{stats.modified}</span>
          <span className="stat stat-same">={stats.same}</span>
        </div>
      </div>

      <div className="diff-selectors">
        <div className="selector">
          <label>版本 A（旧）</label>
          <select value={leftId} onChange={e => setLeftId(e.target.value)} className="edit-input">
            {history.map(h => (
              <option key={h.id} value={h.id}>
                [{h.requirements.length}条] {formatDate(h.timestamp)}
              </option>
            ))}
          </select>
          {onApply && leftResult && (
            <button className="btn btn-small btn-secondary ripple" onClick={() => onApply(leftResult)}>
              应用此版本
            </button>
          )}
        </div>
        <div className="diff-versus">VS</div>
        <div className="selector">
          <label>版本 B（新）</label>
          <select value={rightId} onChange={e => setRightId(e.target.value)} className="edit-input">
            {history.map(h => (
              <option key={h.id} value={h.id}>
                [{h.requirements.length}条] {formatDate(h.timestamp)}
              </option>
            ))}
          </select>
          {onApply && rightResult && (
            <button className="btn btn-small btn-secondary ripple" onClick={() => onApply(rightResult)}>
              应用此版本
            </button>
          )}
        </div>
      </div>

      {history.length < 2 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>历史记录不足</p>
          <p className="empty-hint">至少需要2条历史解析记录才能进行对比</p>
        </div>
      ) : (
        <div className="diff-content">
          <div className="diff-columns">
            <div className="diff-col-header">版本 A</div>
            <div className="diff-col-header diff-col-center">差异类型</div>
            <div className="diff-col-header">版本 B</div>
          </div>
          <div className="diff-rows">
            {diffItems.length === 0 ? (
              <div className="empty-state">
                <p>无差异</p>
              </div>
            ) : (
              diffItems.map((item, idx) => renderDiffRow(item, idx))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
