import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Requirement, Priority } from '../types';
import { detectCircularDependencies } from '../hooks/useParseEngine';
import { checkCircularDependencies } from '../hooks/useLocalStorage';

const ITEM_TYPE = 'REQUIREMENT';

interface DragItem {
  id: string;
  index: number;
}

interface RequirementListProps {
  requirements: Requirement[];
  onReorder: (from: number, to: number) => void;
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  onDelete: (id: string) => void;
  onAdd: (req: Omit<Requirement, 'id' | 'number'>) => void;
}

function RequirementCard({
  req,
  index,
  allRequirements,
  circularIds,
  moveCard,
  onUpdate,
  onDelete
}: {
  req: Requirement;
  index: number;
  allRequirements: Requirement[];
  circularIds: Set<string>;
  moveCard: (fromId: string, toIndex: number) => void;
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(req.title);
  const [description, setDescription] = useState(req.description);
  const [priority, setPriority] = useState<Priority>(req.priority);
  const [depsInput, setDepsInput] = useState(
    req.dependencies.map(depId => {
      const dep = allRequirements.find(r => r.id === depId);
      return dep ? dep.number.toString() : '';
    }).filter(Boolean).join(',')
  );
  const [circularError, setCircularError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const isCircular = circularIds.has(req.id);

  useEffect(() => {
    setTitle(req.title);
    setDescription(req.description);
    setPriority(req.priority);
    setDepsInput(
      req.dependencies.map(depId => {
        const dep = allRequirements.find(r => r.id === depId);
        return dep ? dep.number.toString() : '';
      }).filter(Boolean).join(',')
    );
  }, [req, allRequirements]);

  const [{ isDragging }, drag, preview] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: ITEM_TYPE,
    item: (): DragItem => ({
      id: req.id,
      index
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver, canDrop }, drop] = useDrop<DragItem>({
    accept: ITEM_TYPE,
    canDrop: (item) => item.id !== req.id,
    hover: (item, monitor) => {
      if (!ref.current || !monitor.isOver({ shallow: true })) return;
      const dragId = item.id;
      const hoverIndex = index;
      if (dragId === req.id) return;
      moveCard(dragId, hoverIndex);
      item.index = hoverIndex;
    },
    drop: (item) => {
      moveCard(item.id, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  });

  drag(drop(ref));

  const handleSave = useCallback(() => {
    const depNumbers = depsInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    const depIds: string[] = [];
    const invalidNums: string[] = [];
    for (const numStr of depNumbers) {
      const num = parseInt(numStr, 10);
      if (isNaN(num)) {
        invalidNums.push(numStr);
        continue;
      }
      const found = allRequirements.find(r => r.number === num && r.id !== req.id);
      if (found) {
        depIds.push(found.id);
      } else {
        invalidNums.push(numStr);
      }
    }

    if (invalidNums.length > 0) {
      setCircularError(`编号 ${invalidNums.join(', ')} 的需求不存在，请检查`);
      return;
    }

    const testReqs = allRequirements.map(r =>
      r.id === req.id
        ? { ...r, title: title.trim() || '未命名需求', description: description.trim(), priority, dependencies: depIds }
        : r
    );
    const circular = checkCircularDependencies(testReqs);
    if (circular.length > 0) {
      setCircularError(`检测到循环依赖！涉及条目：${circular.map(c => 'REQ-' + c.number).join(', ')}`);
      return;
    }

    setCircularError(null);
    onUpdate(req.id, {
      title: title.trim() || '未命名需求',
      description: description.trim(),
      priority,
      dependencies: depIds
    });
    setEditing(false);
  }, [depsInput, allRequirements, req.id, req.title, title, description, priority, onUpdate]);

  const handleCancel = () => {
    setTitle(req.title);
    setDescription(req.description);
    setPriority(req.priority);
    setDepsInput(
      req.dependencies.map(depId => {
        const dep = allRequirements.find(r => r.id === depId);
        return dep ? dep.number.toString() : '';
      }).filter(Boolean).join(',')
    );
    setCircularError(null);
    setEditing(false);
  };

  const priorityBadge = (p: Priority) => {
    const map = { '高': 'priority-high', '中': 'priority-mid', '低': 'priority-low' };
    return <span className={`priority-badge ${map[p]}`}>{p}优</span>;
  };

  const renderDeps = () => {
    if (!req.dependencies || req.dependencies.length === 0) {
      return <span className="dep-none">无依赖</span>;
    }
    return req.dependencies.map(depId => {
      const dep = allRequirements.find(r => r.id === depId);
      const depHasError = dep && circularIds.has(dep.id);
      const isInvalid = !dep;
      return (
        <span
          key={depId}
          className={`dep-tag ${isCircular || depHasError ? 'dep-error' : ''} ${isInvalid ? 'dep-invalid' : ''}`}
          title={dep ? dep.title : '无效依赖（条目不存在）'}
        >
          #{dep ? dep.number : '?'}
        </span>
      );
    });
  };

  return (
    <div
      className={`req-card ${isCircular ? 'req-circular' : ''} ${isDragging ? 'dragging' : ''}`}
      ref={ref}
      style={{
        opacity: isDragging ? 0.45 : 1,
        transition: 'transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease, opacity 300ms ease',
        transform: isDragging ? 'rotate(1.5deg) scale(1.02)' : undefined,
        borderTop: isOver && canDrop ? '3px solid var(--mint)' : undefined,
        paddingTop: isOver && canDrop ? undefined : undefined
      }}
    >
      <div className="req-handle" ref={drag} title="拖拽排序">
        <span className="handle-icon">⋮⋮</span>
      </div>

      <div className="req-body">
        <div className="req-header">
          <span className="req-number">REQ-{req.number}</span>
          <span className={`req-type ${req.type === '功能' ? 'type-func' : 'type-nonfunc'}`}>
            {req.type}
          </span>
          {priorityBadge(req.priority)}
          {isCircular && <span className="circular-warn" title="存在循环依赖">⚠ 循环依赖</span>}
        </div>

        {editing ? (
          <div className="req-edit">
            <input
              type="text"
              className="edit-input edit-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="需求标题"
              autoFocus
            />
            <textarea
              className="edit-input edit-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="需求描述"
              rows={3}
            />
            <div className="edit-row">
              <select
                className="edit-input edit-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
              >
                <option value="高">高优先级</option>
                <option value="中">中优先级</option>
                <option value="低">低优先级</option>
              </select>
              <input
                type="text"
                className="edit-input edit-deps"
                value={depsInput}
                onChange={e => setDepsInput(e.target.value)}
                placeholder="依赖编号，用逗号分隔，如: 1,3"
              />
            </div>
            {circularError && (
              <div className="edit-error">
                {circularError}
              </div>
            )}
            <div className="edit-actions">
              <button className="btn btn-small btn-secondary ripple" onClick={handleCancel}>
                取消
              </button>
              <button className="btn btn-small btn-primary ripple" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="req-title">{req.title}</div>
            <div className="req-desc">{req.description}</div>
            <div className="req-footer">
              <div className="req-deps">
                <span className="deps-label">依赖：</span>
                {renderDeps()}
              </div>
              <div className="req-actions">
                <button className="icon-btn ripple" onClick={() => setEditing(true)} title="编辑">
                  ✎
                </button>
                <button
                  className="icon-btn icon-btn-danger ripple"
                  onClick={() => onDelete(req.id)}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RequirementList({
  requirements,
  onReorder,
  onUpdate,
  onDelete,
  onAdd
}: RequirementListProps) {
  const circularIds = useMemo(() => detectCircularDependencies(requirements), [requirements]);
  const hasCircular = circularIds.size > 0;
  const [showCircularAlert, setShowCircularAlert] = useState(false);

  useEffect(() => {
    if (hasCircular) {
      setShowCircularAlert(true);
      const t = setTimeout(() => setShowCircularAlert(false), 3000);
      return () => clearTimeout(t);
    }
  }, [hasCircular, circularIds.size]);

  const moveCard = useCallback((dragId: string, toIndex: number) => {
    const fromIndex = requirements.findIndex(r => r.id === dragId);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
  }, [requirements, onReorder]);

  const handleAddNew = () => {
    onAdd({
      title: '新需求',
      description: '',
      priority: '中',
      type: '功能',
      dependencies: []
    });
  };

  return (
    <div className="req-list-container">
      <div className="list-header">
        <div className="list-header-left">
          <h2>需求列表</h2>
          <span className="list-count">{requirements.length} 条</span>
        </div>
        <div className="list-header-right">
          {hasCircular && (
            <span className={`circular-alert ${showCircularAlert ? 'visible' : ''}`}>
              ⚠ 检测到 {circularIds.size} 条循环依赖
            </span>
          )}
          <button className="btn btn-secondary ripple" onClick={handleAddNew}>
            + 新增需求
          </button>
        </div>
      </div>

      {requirements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>暂无需求条目</p>
          <p className="empty-hint">请在左侧输入需求描述并点击"解析需求"，或手动新增</p>
        </div>
      ) : (
        <div className="req-list">
          {requirements.map((req, index) => (
            <RequirementCard
              key={req.id}
              req={req}
              index={index}
              allRequirements={requirements}
              circularIds={circularIds}
              moveCard={moveCard}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
