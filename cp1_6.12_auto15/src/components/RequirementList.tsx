import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import type { Requirement, Priority } from '../types';
import { detectCircularDependencies } from '../hooks/useParseEngine';

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
  onUpdate,
  onDelete,
  onToggleEdit
}: {
  req: Requirement;
  index: number;
  allRequirements: Requirement[];
  circularIds: Set<string>;
  onUpdate: (id: string, updates: Partial<Requirement>) => void;
  onDelete: (id: string) => void;
  onToggleEdit: (id: string | null) => void;
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

  const handleSave = () => {
    const depNumbers = depsInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    const depIds: string[] = [];
    for (const numStr of depNumbers) {
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        const found = allRequirements.find(r => r.number === num && r.id !== req.id);
        if (found) depIds.push(found.id);
      }
    }
    onUpdate(req.id, {
      title: title.trim() || '未命名需求',
      description: description.trim(),
      priority,
      dependencies: depIds
    });
    setEditing(false);
    onToggleEdit(null);
  };

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
    setEditing(false);
    onToggleEdit(null);
  };

  const handleStartEdit = () => {
    setEditing(true);
    onToggleEdit(req.id);
  };

  const priorityBadge = (p: Priority) => {
    const map = {
      '高': 'priority-high',
      '中': 'priority-mid',
      '低': 'priority-low'
    };
    return <span className={`priority-badge ${map[p]}`}>{p}优</span>;
  };

  const renderDeps = () => {
    if (!req.dependencies || req.dependencies.length === 0) {
      return <span className="dep-none">无依赖</span>;
    }
    return req.dependencies.map(depId => {
      const dep = allRequirements.find(r => r.id === depId);
      const depHasError = dep && circularIds.has(dep.id);
      return (
        <span
          key={depId}
          className={`dep-tag ${isCircular || depHasError ? 'dep-error' : ''}`}
          title={dep ? dep.title : '未知依赖'}
        >
          #{dep ? dep.number : '?'}
        </span>
      );
    });
  };

  return (
    <Draggable draggableId={req.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`req-card ${isCircular ? 'req-circular' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className="req-handle" {...provided.dragHandleProps}>
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
                    <button className="icon-btn ripple" onClick={handleStartEdit} title="编辑">
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
      )}
    </Draggable>
  );
}

export default function RequirementList({
  requirements,
  onReorder,
  onUpdate,
  onDelete,
  onAdd
}: RequirementListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  const handleAddNew = () => {
    onAdd({
      title: '新需求',
      description: '',
      priority: '中',
      type: '功能',
      dependencies: []
    });
  };

  const handleToggleEdit = (id: string | null) => {
    setEditingId(id);
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
            <span
              className={`circular-alert ${showCircularAlert ? 'visible' : ''}`}
            >
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="requirements">
            {provided => (
              <div
                className="req-list"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {requirements.map((req, index) => (
                  <RequirementCard
                    key={req.id}
                    req={req}
                    index={index}
                    allRequirements={requirements}
                    circularIds={circularIds}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onToggleEdit={handleToggleEdit}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
