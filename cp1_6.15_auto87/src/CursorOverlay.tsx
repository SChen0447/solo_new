import React from 'react';
import { useStore } from './store';

interface CursorOverlayProps {
  width: number;
  height: number;
}

const CursorOverlay: React.FC<CursorOverlayProps> = ({ width, height }) => {
  const { cursors, position, scale, currentUser } = useStore();

  const cursorArray = Array.from(cursors.values()).filter(
    cursor => !currentUser || cursor.userId !== currentUser.id
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 100
      }}
    >
      {cursorArray.map((cursor) => {
        const screenX = cursor.x * scale + position.x;
        const screenY = cursor.y * scale + position.y;

        if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) {
          return null;
        }

        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: cursor.userColor,
                boxShadow: `0 0 0 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.3)`
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: -20,
                fontSize: 12,
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '2px 6px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              {cursor.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CursorOverlay;
