import { useMemo, useState } from 'react';
import type { ParseResult, Requirement } from '../types';

interface DiffViewProps {
  history: ParseResult[];
  onClose: () => void;
  onApply?: (result: ParseResult) => void;
}

type DiffType = 'added' | 'removed' | 'modified' | 'same';

interface DiffItem {
  key: string;
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
  const leftById = new Map(left.map(r => [r.title, r]));
  const rightById = new Map(right.map(r => [r.title, r]));
  const allTitles = new Set([...leftById.keys(), ...rightById.keys()]);
  const items: DiffItem[] = [];

  for (const title of allTitles) {
    const l = leftById.get(title);
    const r = rightById.get(title);

    if (l && r) {
      const changedFields: string[] = [];
      if (l.description !== r.description) changedFields.push('描述');
      if (l.priority !== r.priority) changedFields.push('优先级');
      if (l.type !== r.type) changedFields.push('类型');
      const lDepKey = [...l.dependencies].sort().join(',');
      const rDepKey = [...r.dependencies].sort().join(',');
      if (lDepKey !== rDepKey) changedFields.push('依赖');

      if (changedFields.length > 0) {
        items.push({ key: `mod-${l.id}-${r.id}`, type: 'modified', left: l, right: r, changedFields });
      } else {
        items.push({ key: `same-${l.id}`, type: 'same', left: l, right: r });
      }
    } else if (!l && r) {
      items.push({ key: `add-${r.id}`, type: 'added', right: r });
    } else if (l && !r) {
      items.push({ key: `rem-${l.id}`, type: 'removed', left: l });
    }
  }

  return items.sort((a, b) => {
    const order = { added: 0, removed: 1, modified: 2, same: 3 };
    return order[a.type] - order[b.type];
  });
}

function ReqCard({ req, type, side, changedFields }: {
  req: Requirement;
  type: DiffType;
  side: 'left' | 'right';
  changedFields?: string[];
}) {
  const isChanged = (field: string) => changedFields?.includes(field) || false;

  return (
    <div className={`diff-req diff-type-${type} diff-side-${side}`}>
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
        <DiffField label="标题" value={req.title} changed={false} type={type} />
        <DiffField label="描述" value={req.description} changed={isChanged('描述')} type={type} />
        <DiffField label="优先级" value={req.priority} changed={isChanged('优先级')} type={type} />
        <DiffField label="类型" value={req.type} changed={isChanged('类型')} type={type} />
      </div>
    </div>
  );
}

function DiffField({ label, value, changed, type }: {
  label: string;
  value: string;
  changed: boolean;
  type: DiffType;
}) {
  return (
    <div className={`diff-field ${changed ? 'diff-field-changed' : ''}`}>
      <span className="diff-field-label">{label}:</span>
      <span
        className={`diff-field-value ${
          type === 'added' ? 'diff-val-added' :
          type === 'removed' ? 'diff-val-removed' :
          changed ? 'diff-val-modified' : ''
        }`}
      >
        {value}
      </span>
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

  return (
    <div className="diff-view">
      <div className="diff-header">
        <button className="btn btn-secondary ripple" onClick={onClose}>
          ← 返回列表
        </button>
        <h2>需求对比视图</h2>
        <div className="diff-stats">
          <span className="stat stat-added">+{stats.added} 新增</span>
          <span className="stat stat-removed">−{stats.removed} 删除</span>
          <span className="stat stat-modified">~{stats.modified} 修改</span>
          <span className="stat stat-same">={stats.same} 相同</span>
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
            <div className="diff-col-header">版本 A（旧）</div>
            <div className="diff-col-header diff-col-center">差异类型</div>
            <div className="diff-col-header">版本 B（新）</div>
          </div>
          <div className="diff-rows">
            {diffItems.length === 0 ? (
              <div className="empty-state">
                <p>两个版本完全一致，无差异</p>
              </div>
            ) : (
              diffItems.map(item => {
                let labelClass = '';
                let labelText = '';
                switch (item.type) {
                  case 'added':
                    labelClass = 'diff-label-added';
                    labelText = '+ 新增';
                    break;
                  case 'removed':
                    labelClass = 'diff-label-removed';
                    labelText = '− 删除';
                    break;
                  case 'modified':
                    labelClass = 'diff-label-modified';
                    labelText = '~ 修改';
                    break;
                  case 'same':
                    labelClass = 'diff-label-same';
                    labelText = '= 相同';
                    break;
                }

                return (
                  <div key={item.key} className={`diff-row diff-${item.type}`}>
                    <div className="diff-side">
                      {item.left ? (
                        <ReqCard req={item.left} type={item.type} side="left" changedFields={item.changedFields} />
                      ) : (
                        <div className="diff-empty">—</div>
                      )}
                    </div>
                    <div className="diff-divider">
                      <span className={`diff-type-label ${labelClass}`}>{labelText}</span>
                      {item.changedFields && item.changedFields.length > 0 && (
                        <div className="diff-changed-fields">{item.changedFields.join(', ')}</div>
                      )}
                    </div>
                    <div className="diff-side">
                      {item.right ? (
                        <ReqCard req={item.right} type={item.type} side="right" changedFields={item.changedFields} />
                      ) : (
                        <div className="diff-empty">—</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
