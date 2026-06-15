import React, { useState, useRef } from 'react';
import { EMOJI_CATEGORIES, Point } from './types';

interface EmojiPanelProps {
  onEmojiDragStart: (emoji: string) => void;
  onEmojiDragEnd: (emoji: string, position: Point) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const EmojiPanel: React.FC<EmojiPanelProps> = ({
  onEmojiDragStart,
  onEmojiDragEnd,
  canvasRef
}) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [draggingEmoji, setDraggingEmoji] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<Point>({ x: 0, y: 0 });
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, emoji: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    setDraggingEmoji(emoji);
    setDragPosition({ x: startX, y: startY });
    onEmojiDragStart(emoji);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const canvasX = (upEvent.clientX - rect.left) * scaleX;
        const canvasY = (upEvent.clientY - rect.top) * scaleY;

        if (
          canvasX >= 0 &&
          canvasX <= canvasRef.current.width &&
          canvasY >= 0 &&
          canvasY <= canvasRef.current.height
        ) {
          onEmojiDragEnd(emoji, { x: canvasX, y: canvasY });
        }
      }

      setDraggingEmoji(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const currentCategory = EMOJI_CATEGORIES[activeCategory];

  return (
    <div className="emoji-panel">
      <div className="emoji-categories">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            className={`category-tab ${index === activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(index)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {currentCategory.emojis.map((emoji, index) => (
          <div
            key={`${emoji}-${index}`}
            className="emoji-item"
            onMouseDown={(e) => handleMouseDown(e, emoji)}
            title={`拖拽 ${emoji} 到画布`}
          >
            {emoji}
          </div>
        ))}
      </div>

      {draggingEmoji && (
        <div
          ref={dragPreviewRef}
          className="emoji-drag-preview"
          style={{
            left: dragPosition.x - 22,
            top: dragPosition.y - 22
          }}
        >
          {draggingEmoji}
        </div>
      )}
    </div>
  );
};
