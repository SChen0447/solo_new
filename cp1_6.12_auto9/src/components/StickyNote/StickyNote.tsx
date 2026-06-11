import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { StickyNoteBlock } from '../../utils/constants';
import { STICKY_COLORS } from '../../utils/constants';
import { useCanvasStore } from '../../stores/canvasStore';
import { useDragRotation } from '../../hooks/useDragRotation';
import { Palette, Trash2, Type, List, Heading1, Heading2, Bold } from 'lucide-react';

interface StickyNoteProps {
  block: StickyNoteBlock;
  scale: number;
  viewportX: number;
  viewportY: number;
}

export const StickyNote = memo(function StickyNote({
  block,
  scale,
  viewportX,
  viewportY,
}: StickyNoteProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  const selectedBlockId = useCanvasStore((s) => s.selectedBlockId);
  const setSelectedBlock = useCanvasStore((s) => s.setSelectedBlock);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const updateBlockPosition = useCanvasStore((s) => s.updateBlockPosition);
  const updateBlockRotation = useCanvasStore((s) => s.updateBlockRotation);
  const deleteBlock = useCanvasStore((s) => s.deleteBlock);
  const bringToFront = useCanvasStore((s) => s.bringToFront);

  const isSelected = selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: block.id,
    disabled: isEditing,
    data: { type: 'sticky', block },
  });

  const {
    isRotating,
    displayAngle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useDragRotation({
    initialRotation: block.rotation,
    blockWidth: block.width,
    blockHeight: block.height,
    blockX: block.x,
    blockY: block.y,
    onRotate: (r) => updateBlockRotation(block.id, r),
  });

  const screenX = viewportX + block.x * scale;
  const screenY = viewportY + block.y * scale;
  const screenW = block.width * scale;
  const screenH = block.height * scale;

  const handleTransform = transform
    ? {
        x: transform.x * scale,
        y: transform.y * scale,
        scaleX: 1,
        scaleY: 1,
      }
    : null;

  const transformStyle = handleTransform
    ? `translate(${screenX + handleTransform.x}px, ${screenY + handleTransform.y}px) rotate(${block.rotation}deg) scale(${scale})`
    : `translate(${screenX}px, ${screenY}px) rotate(${block.rotation}deg) scale(${scale})`;

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== block.content) {
      editorRef.current.innerHTML = block.content;
    }
  }, [block.id]);

  const handleFocusEditor = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      setShowToolbar(true);
      setTimeout(() => {
        editorRef.current?.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        if (editorRef.current && sel) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 50);
    }
  }, [isEditing]);

  const handleBlurEditor = useCallback(() => {
    if (editorRef.current) {
      updateBlock(block.id, { content: editorRef.current.innerHTML });
    }
    setIsEditing(false);
    setShowToolbar(false);
  }, [block.id, updateBlock]);

  const execCommand = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      updateBlock(block.id, { content: editorRef.current.innerHTML });
    }
  }, [block.id, updateBlock]);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isSelected) {
        setSelectedBlock(block.id);
        bringToFront(block.id);
      }
    },
    [block.id, isSelected, setSelectedBlock, bringToFront]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelect(e);
      handleFocusEditor();
    },
    [handleSelect, handleFocusEditor]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteBlock(block.id);
    },
    [block.id, deleteBlock]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      updateBlock(block.id, { backgroundColor: color });
      setShowColorPicker(false);
    },
    [block.id, updateBlock]
  );

  return (
    <div
      ref={setNodeRef}
      className={`sticky-note block-enter ${isSelected ? 'selected' : ''} ${
        isDragging ? 'dragging' : ''
      }`}
      style={{
        width: block.width,
        height: block.height,
        background: block.backgroundColor,
        transform: transformStyle,
        transformOrigin: '0 0',
        zIndex: isDragging || isRotating ? 99999 : block.zIndex,
        left: 0,
        top: 0,
        willChange: isDragging || isRotating ? 'transform' : undefined,
      }}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        }}
        {...(!isEditing && !isRotating ? attributes : {})}
        {...(!isEditing && !isRotating ? listeners : {})}
      >
        {showToolbar && isSelected && (
          <div
            className="rich-toolbar"
            style={{
              position: 'absolute',
              top: -44,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="rich-btn h1"
              title="标题1"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('formatBlock', 'h1');
              }}
            >
              <Heading1 size={14} />
            </button>
            <button
              className="rich-btn h2"
              title="标题2"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('formatBlock', 'h2');
              }}
            >
              <Heading2 size={14} />
            </button>
            <button
              className="rich-btn bold"
              title="加粗"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('bold');
              }}
            >
              <Bold size={14} />
            </button>
            <button
              className="rich-btn"
              title="无序列表"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertUnorderedList');
              }}
            >
              <List size={14} />
            </button>
            <button
              className="rich-btn"
              title="有序列表"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertOrderedList');
              }}
            >
              <Type size={14} />
            </button>
            <div style={{ width: 1, background: '#e5e1db', margin: '4px 2px' }} />
            <div style={{ position: 'relative' }}>
              <button
                className="rich-btn"
                title="颜色"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowColorPicker((v) => !v);
                }}
              >
                <Palette size={14} />
              </button>
              {showColorPicker && (
                <div
                  className="color-picker"
                  style={{
                    position: 'absolute',
                    top: 36,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 120,
                    zIndex: 100,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {STICKY_COLORS.map((color) => (
                    <div
                      key={color}
                      className={`color-swatch ${
                        block.backgroundColor === color ? 'selected' : ''
                      }`}
                      style={{ background: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              className="rich-btn"
              title="删除"
              style={{ color: '#c53030' }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDelete(e as unknown as React.MouseEvent);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div
          ref={editorRef}
          className="sticky-editor"
          contentEditable={isEditing}
          suppressContentEditableWarning
          data-placeholder="双击开始编辑..."
          onBlur={handleBlurEditor}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.target as HTMLElement).blur();
            }
            e.stopPropagation();
          }}
          style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
        />

        {isSelected && !isEditing && !isDragging && (
          <>
            <div
              className="rotate-handle"
              style={{
                left: block.width / 2 - 11,
                top: block.height + 16,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: block.height + 2,
                width: 1,
                height: 16,
                background: '#E07A5F',
                transform: 'translateX(-50%)',
                opacity: 0.6,
              }}
            />
          </>
        )}

        {displayAngle !== null && (
          <div
            className="angle-indicator"
            style={{
              left: block.width / 2,
              top: block.height + 50,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.round(displayAngle)}°
          </div>
        )}
      </div>

      <div style={{ display: 'none' }}>{screenW}{screenH}</div>
    </div>
  );
});

export default StickyNote;
