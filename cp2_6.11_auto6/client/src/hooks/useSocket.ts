import { useEffect, useCallback } from 'react';
import useStore from '../store/useStore';

export function useSocket() {
  const socket = useStore((s) => s.socket);

  const emitCursorMove = useCallback(
    (x: number, y: number) => {
      if (socket) {
        socket.emit('cursor-move', { x, y });
      }
    },
    [socket]
  );

  const emitCreateRoom = useCallback(() => {
    return new Promise<string>((resolve) => {
      if (socket) {
        socket.emit('create-room');
        const handler = (data: { roomId: string }) => {
          socket.off('room-created', handler);
          resolve(data.roomId);
        };
        socket.on('room-created', handler);
      }
    });
  }, [socket]);

  const requestSnapshot = useCallback(
    (timestamp: number) => {
      if (socket) {
        socket.emit('request-snapshot', { timestamp });
      }
    },
    [socket]
  );

  const requestTimeline = useCallback(() => {
    if (socket) {
      socket.emit('request-timeline');
    }
  }, [socket]);

  return { emitCursorMove, emitCreateRoom, requestSnapshot, requestTimeline };
}
