import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import type { CanvasComponent as CanvasComponentType, HandleType, TextComponent } from '../types';
import { useCanvasStore } from '../store/canvasStore';

interface CanvasComponentProps {
  component: CanvasComponentType;
  isSelected: boolean;
  onStartDrag: (e: React.MouseEvent, id: string, mode: 'move' | 'resize' | 'rotate', handle?: HandleType) => void;
  onDoubleClick: (id: string) => void;
}

const Handles: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const handlePositions: Record<HandleType, React.CSSProperties> = {
  nw: { top: -6, left: -6, cursor: 'nwse-resize' },
  n: { top: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
  ne: { top: -6, right: -6, cursor: 'nesw-resize' },
  e: { top: '50%', right: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' },
  se: { bottom: -6, right: -6, cursor: 'nwse-resize' },
  s: { bottom: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
  sw: { bottom: -6, left: -6, cursor: 'nesw-resize' },
  w: { top: '50%', left: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' },
};

const CanvasComponentInner: React.FC<CanvasComponentProps> = ({ component, isSelected, onStartDrag, onDoubleClick }) => {
  const editingTextId = useCanvasStore((s) => s.editingTextId);
  const updateComponent = useCanvasStore((s) => s.updateComponent);
  const setEditingTextId = useCanvasStore((s) => s.setEditingTextId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editingContent, setEditingContent] = useState('');

  const isEditing = editingTextId === component.id && component.type === 'text';

  useEffect(() => {
    if (isEditing && textareaRef.current && component.type === 'text') {
      setEditingContent((component as TextComponent).content);
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing, component]);

  const handleTextBlur = useCallback(() => {
    if (component.type === 'text') {
      updateComponent(component.id, { content: editingContent });
    }
    setEditingTextId(null);
  }, [component, editingContent, updateComponent, setEditingTextId]);

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingTextId(null);
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleTextBlur();
      }
    },
    [handleTextBlur, setEditingTextId]
  );

  const renderContent = () => {
    switch (component.type) {
      case 'text': {
        const textComp = component as TextComponent;
        if (isEditing) {
          return (
            <textarea
              ref={textareaRef}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: '2px dashed #1A237E',
                outlineOffset: 2,
                background: textComp.backgroundColor === 'transparent' ? '#FFFFFF' : textComp.backgroundColor,
                color: textComp.color,
                fontSize: textComp.fontSize,
                fontFamily: textComp.fontFamily,
                fontWeight: textComp.fontWeight,
                fontStyle: textComp.fontStyle,
                textDecoration: textComp.textDecoration === 'underline' ? 'underline' : 'none',
                lineHeight: textComp.lineHeight,
                textAlign: textComp.textAlign,
                resize: 'none',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
              }}
            />
          );
        }
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                textComp.textAlign === 'center' ? 'center' : textComp.textAlign === 'right' ? 'flex-end' : 'flex-start',
              backgroundColor: textComp.backgroundColor === 'transparent' ? 'transparent' : textComp.backgroundColor,
              color: textComp.color,
              fontSize: textComp.fontSize,
              fontFamily: `"${textComp.fontFamily}", sans-serif`,
              fontWeight: textComp.fontWeight,
              fontStyle: textComp.fontStyle,
              textDecoration: textComp.textDecoration === 'underline' ? 'underline' : 'none',
              lineHeight: textComp.lineHeight,
              textAlign: textComp.textAlign,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              padding: 4,
              boxSizing: 'border-box',
            }}
          >
            {textComp.content}
          </div>
        );
      }
      case 'image':
        return (
          <img
            src={component.src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        );
      case 'rect':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: component.fill,
              border: component.strokeWidth > 0 ? `${component.strokeWidth}px solid ${component.stroke}` : 'none',
              borderRadius: component.borderRadius,
              boxSizing: 'border-box',
            }}
          />
        );
      case 'circle':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: component.fill,
              border: component.strokeWidth > 0 ? `${component.strokeWidth}px solid ${component.stroke}` : 'none',
              borderRadius: '50%',
              boxSizing: 'border-box',
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!component.visible) {
    return null;
  }

  const transform = `translate(${component.x}px, ${component.y}px) rotate(${component.rotation}deg)`;

  return (
    <div
      data-component-id={component.id}
      onMouseDown={(e) => !isEditing && onStartDrag(e, component.id, 'move')}
      onDoubleClick={() => component.type === 'text' && onDoubleClick(component.id)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: component.width,
        height: component.height,
        transform,
        transformOrigin: 'center center',
        opacity: component.opacity,
        cursor: component.locked ? 'not-allowed' : isEditing ? 'text' : 'move',
        zIndex: component.zIndex,
        willChange: 'transform',
        boxSizing: 'border-box',
        userSelect: isEditing ? 'text' : 'none',
      }}
    >
      {renderContent()}

      {isSelected && !component.locked && !isEditing && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '2px solid #1A237E',
              pointerEvents: 'none',
            }}
          />
          {Handles.map((handle) => (
            <div
              key={handle}
              onMouseDown={(e) => onStartDrag(e, component.id, 'resize', handle)}
              style={{
                position: 'absolute',
                width: 12,
                height: 12,
                background: '#FFFFFF',
                border: '2px solid #1A237E',
                borderRadius: '50%',
                ...handlePositions[handle],
                zIndex: 1000,
              }}
            />
          ))}
          <div
            onMouseDown={(e) => onStartDrag(e, component.id, 'rotate')}
            style={{
              position: 'absolute',
              left: '50%',
              top: -30,
              transform: 'translateX(-50%)',
              width: 14,
              height: 14,
              background: '#FF6F00',
              border: '2px solid #FFFFFF',
              borderRadius: '50%',
              cursor: 'grab',
              zIndex: 1000,
            }}
            title="旋转"
          />
        </>
      )}
    </div>
  );
};

export const CanvasComponent = memo(CanvasComponentInner, (prev, next) => {
  return (
    prev.component === next.component &&
    prev.isSelected === next.isSelected
  );
});
