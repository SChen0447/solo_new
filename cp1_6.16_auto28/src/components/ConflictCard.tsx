import { useState, useEffect, useRef } from 'react';
import type { ParagraphDiff, ConflictResolution } from '../types';

interface ConflictCardProps {
  diff: ParagraphDiff;
  resolution?: ConflictResolution;
  onSelectA: () => void;
  onSelectB: () => void;
  onEdit: (content: string) => void;
}

export function ConflictCard({ diff, resolution, onSelectA, onSelectB, onEdit }: ConflictCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [editValue, setEditValue] = useState(resolution?.resolvedContent ?? '');
  const lastSourceRef = useRef<string | null>(null);

  useEffect(() => {
    const newContent = resolution?.resolvedContent ?? '';
    if (resolution?.source && lastSourceRef.current !== resolution.source) {
      setIsAnimating(true);
      setEditValue(newContent);
      lastSourceRef.current = resolution.source;
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    } else {
      setEditValue(newContent);
    }
  }, [resolution?.resolvedContent, resolution?.source]);

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditValue(value);
    onEdit(value);
  };

  const isResolved = resolution && resolution.resolvedContent.length > 0;
  const bgClass = diff.type === 'modified'
    ? 'diff-modified'
    : diff.type === 'added'
    ? 'diff-added'
    : 'diff-removed';

  return (
    <div className={`conflict-card ${bgClass}`}>
      <div className="conflict-card-header">
        <span className="conflict-type-label">
          {diff.type === 'modified' && '✏️ 修改段落'}
          {diff.type === 'added' && '➕ 新增段落'}
          {diff.type === 'removed' && '➖ 删除段落'}
        </span>
        <div className="conflict-card-actions">
          <button
            className={`action-btn btn-a ${resolution?.source === 'A' ? 'active' : ''}`}
            onClick={onSelectA}
          >
            保留A版本
          </button>
          <button
            className={`action-btn btn-b ${resolution?.source === 'B' ? 'active' : ''}`}
            onClick={onSelectB}
          >
            保留B版本
          </button>
        </div>
      </div>

      <div className="conflict-card-body">
        <div className="version-preview version-a">
          <div className="version-label">A 版本</div>
          <div className="version-content">{diff.contentA || <em className="empty-hint">（空）</em>}</div>
        </div>

        <div className="version-preview version-b">
          <div className="version-label">B 版本</div>
          <div className="version-content">{diff.contentB || <em className="empty-hint">（空）</em>}</div>
        </div>
      </div>

      <div className="conflict-card-editor">
        <div className="editor-label">
          合并结果
          {isResolved && <span className="resolved-badge">已解决</span>}
        </div>
        <textarea
          className={`merge-editor ${isAnimating ? 'fade-in' : ''}`}
          value={editValue}
          onChange={handleEditChange}
          placeholder="在此处编辑合并后的内容，或点击上方按钮选择版本..."
          rows={4}
        />
      </div>
    </div>
  );
}
