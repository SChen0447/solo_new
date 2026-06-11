import { useMemo, useState } from 'react';
import type { ParseResult, Requirement } from '../types';

interface DiffViewProps {
  history: ParseResult[];
  onClose: () => void;
  onApply?: (result: ParseResult) => void;
}

type DiffType = 'added' | 'removed' | 'modified' | 'same';

interface FieldChange {
  field: string;
  oldValue: string | string[];
  newValue: string | string[];
  addedItems?: string[];
  removedItems?: string[];
}

interface DiffItem {
  key: string;
  type: DiffType;
  left?: Requirement;
  right?: Requirement;
  changes?: FieldChange[];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeArrayDiff(
  leftArr: string[],
  rightArr: string[],
  idToLabel?: (id: string) => string
): { addedItems: string[]; removedItems: string[]; changed: boolean } {
  const leftSet = new Set(leftArr);
  const rightSet = new Set(rightArr);
  const added: string[] = [];
  const removed: string[] = [];

  for (const item of rightArr) {
    if (!leftSet.has(item)) {
      added.push(idToLabel ? idToLabel(item) : item);
    }
  }
  for (const item of leftArr) {
    if (!rightSet.has(item)) {
      removed.push(idToLabel ? idToLabel(item) : item);
    }
  }
  return {
    addedItems: added,
    removedItems: removed,
    changed: added.length > 0 || removed.length > 0
  };
}

function computeDiff(left: Requirement[], right: Requirement[]): DiffItem[] {
  const leftById = new Map(left.map(r => [r.title, r]));
  const rightById = new Map(right.map(r => [r.title, r]));
  const allTitles = new Set([...leftById.keys(), ...rightById.keys()]);
  const items: DiffItem[] = [];

  const numToLabelLeft = (id: string) => {
    const found = left.find(r => r.id === id);
    return found ? `REQ-${found.number}` : id;
  };
  const numToLabelRight = (id: string) => {
    const found = right.find(r => r.id === id);
    return found ? `REQ-${found.number}` : id;
  };

  for (const title of allTitles) {
    const l = leftById.get(title);
    const r = rightById.get(title);

    if (l && r) {
      const changes: FieldChange[] = [];

      if (l.description !== r.description) {
        changes.push({
          field: '描述',
          oldValue: l.description,
          newValue: r.description
        });
      }
      if (l.priority !== r.priority) {
        changes.push({
          field: '优先级',
          oldValue: l.priority,
          newValue: r.priority
        });
      }
      if (l.type !== r.type) {
        changes.push({
          field: '类型',
          oldValue: l.type,
          newValue: r.type
        });
      }

      const depDiff = computeArrayDiff(l.dependencies, r.dependencies, (id) => {
        const inLeft = left.find(x => x.id === id);
        const inRight = right.find(x => x.id === id);
        return inRight ? `REQ-${inRight.number}` : inLeft ? `REQ-${inLeft.number}` : id;
      });
      if (depDiff.changed) {
        changes.push({
          field: '依赖',
          oldValue: l.dependencies.map(numToLabelLeft),
          newValue: r.dependencies.map(numToLabelRight),
          addedItems: depDiff.addedItems,
          removedItems: depDiff.removedItems
        });
      }

      if (changes.length > 0) {
        items.push({
          key: `mod-${l.id}-${r.id}`,
          type: 'modified',
          left: l,
          right: r,
          changes
        });
      } else {
        items.push({
          key: `same-${l.id}`,
          type: 'same',
          left: l,
          right: r
        });
      }
    } else if (!l && r) {
      items.push({ key: `add-${r.id}`, type: 'added', right: r });
    } else if (l && !r) {
      items.push({ key: `rem-${l.id}`, type: 'removed', left: l });
    }
  }

  return items.sort((a, b) => {
    const order: Record<DiffType, number> = { added: 0, removed: 1, modified: 2, same: 3 };
    return order[a.type] - order[b.type];
  });
}

function ReqCard({ req, type, side, changes }: {
  req: Requirement;
  type: DiffType;
  side: 'left' | 'right';
  changes?: FieldChange[];
}) {
  const getChange = (field: string) => changes?.find(c => c.field === field);

  const renderField = (label: string, value: string, field: string) => {
    const change = getChange(field);
    const isChanged = !!change;

    if (type === 'removed' && side === 'left') {
      return (
        <div className={`diff-field ${isChanged ? 'diff-field-changed' : ''}`}>
          <span className="diff-field-label">{label}:</span>
          <span className="diff-field-value diff-val-removed">{value}</span>
        </div>
      );
    }

    if (type === 'added' && side === 'right') {
      return (
        <div className={`diff-field ${isChanged ? 'diff-field-changed' : ''}`}>
          <span className="diff-field-label">{label}:</span>
          <span className="diff-field-value diff-val-added">{value}</span>
        </div>
      );
    }

    if (type === 'modified' && isChanged && change) {
      const oldVal = Array.isArray(change.oldValue)
        ? change.oldValue.join(', ') || '(无)'
        : change.oldValue as string;
      const newVal = Array.isArray(change.newValue)
        ? change.newValue.join(', ') || '(无)'
        : change.newValue as string;
      const hasAddRem = change.addedItems || change.removedItems;

      return (
        <div className="diff-field diff-field-changed">
          <span className="diff-field-label">{label}:</span>
          <div className="diff-field-change">
            <div className="diff-old-row">
              <span className="diff-change-tag diff-change-remove">−</span>
              <span className="diff-old">{oldVal || '(空)'}</span>
            </div>
            <div className="diff-new-row">
              <span className="diff-change-tag diff-change-add">+</span>
              <span className="diff-new">{newVal || '(空)'}</span>
            </div>
            {hasAddRem && (
              <div className="diff-array-changes">
                {change.addedItems && change.addedItems.length > 0 && (
                  <div className="diff-array-add">新增：{change.addedItems.join(', ')}</div>
                )}
                {change.removedItems && change.removedItems.length > 0 && (
                  <div className="diff-array-remove">删除：{change.removedItems.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`diff-field ${isChanged ? 'diff-field-changed' : ''}`}>
        <span className="diff-field-label">{label}:</span>
        <span className="diff-field-value">{value}</span>
      </div>
    );
  };

  const depsCount = req.dependencies.length;
  const depsLabel = depsCount > 0 ? `${depsCount} 个依赖` : '无';

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
        {renderField('标题', req.title, '标题')}
        {renderField('描述', req.description, '描述')}
        {renderField('优先级', req.priority, '优先级')}
        {renderField('类型', req.type, '类型')}
        {renderField('依赖', depsLabel, '依赖')}
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

  const renderRow = (item: DiffItem) => {
    const labelMap = {
      added: { class: 'diff-label-added', text: '+ 新增' },
      removed: { class: 'diff-label-removed', text: '− 删除' },
      modified: { class: 'diff-label-modified', text: '~ 修改' },
      same: { class: 'diff-label-same', text: '= 相同' }
    };
    const label = labelMap[item.type];

    return (
      <div key={item.key} className={`diff-row diff-${item.type}`}>
        <div className="diff-side">
          {item.left ? (
            <ReqCard req={item.left} type={item.type} side="left" changes={item.changes} />
          ) : (
            <div className="diff-empty">—</div>
          )}
        </div>
        <div className="diff-divider">
          <span className={`diff-type-label ${label.class}`}>{label.text}</span>
          {item.changes && item.changes.length > 0 && (
            <div className="diff-changed-fields">
              {item.changes.map(c => c.field).join(', ')}
            </div>
          )}
        </div>
        <div className="diff-side">
          {item.right ? (
            <ReqCard req={item.right} type={item.type} side="right" changes={item.changes} />
          ) : (
            <div className="diff-empty">—</div>
          )}
        </div>
      </div>
    );
  };

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
              diffItems.map(item => renderRow(item))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
