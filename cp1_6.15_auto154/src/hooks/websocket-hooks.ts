import { useState, useEffect, useCallback, useRef } from 'react';
import type { WebSocketMessage, Annotation, PathMark, Track, Member } from '../../../shared/types';

interface UseWebSocketOptions {
  activityId: string;
  memberName: string;
  onAnnotationReceived?: (annotation: Annotation) => void;
  onPathMarkReceived?: (pathMark: PathMark) => void;
  onTrackReceived?: (track: Track) => void;
  onMemberJoined?: (member: Member) => void;
  onActivityUpdate?: (data: any) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendAnnotation: (annotation: Annotation) => void;
  sendPathMark: (pathMark: PathMark) => void;
  sendTrack: (track: Track) => void;
  sendJoin: () => void;
  reconnect: () => void;
}

export function useWebSocket({
  activityId,
  memberName,
  onAnnotationReceived,
  onPathMarkReceived,
  onTrackReceived,
  onMemberJoined,
  onActivityUpdate,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        const joinMessage: WebSocketMessage = {
          type: 'join',
          activityId,
          memberName,
        };
        wsRef.current?.send(JSON.stringify(joinMessage));

        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift();
          if (msg) {
            wsRef.current?.send(JSON.stringify(msg));
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        scheduleReconnect();
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket connection:', e);
      scheduleReconnect();
    }
  }, [activityId, memberName]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 3000);
  }, [connect]);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'annotation-added':
          if (onAnnotationReceived && message.data) {
            onAnnotationReceived(message.data);
          }
          break;
        case 'path-mark-added':
          if (onPathMarkReceived && message.data) {
            onPathMarkReceived(message.data);
          }
          break;
        case 'track-added':
          if (onTrackReceived && message.data) {
            onTrackReceived(message.data);
          }
          break;
        case 'member-joined':
          if (onMemberJoined && message.data) {
            onMemberJoined(message.data);
          }
          break;
        case 'activity-update':
          if (onActivityUpdate && message.data) {
            onActivityUpdate(message.data);
          }
          break;
      }
    },
    [onAnnotationReceived, onPathMarkReceived, onTrackReceived, onMemberJoined, onActivityUpdate]
  );

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        messageQueueRef.current.push(message);
        if (!isConnected) {
          connect();
        }
      }
    },
    [isConnected, connect]
  );

  const sendAnnotation = useCallback(
    (annotation: Annotation) => {
      sendMessage({
        type: 'annotation',
        activityId,
        data: annotation,
      });
    },
    [activityId, sendMessage]
  );

  const sendPathMark = useCallback(
    (pathMark: PathMark) => {
      sendMessage({
        type: 'path-mark',
        activityId,
        data: pathMark,
      });
    },
    [activityId, sendMessage]
  );

  const sendTrack = useCallback(
    (track: Track) => {
      sendMessage({
        type: 'track-added',
        activityId,
        data: track,
      });
    },
    [activityId, sendMessage]
  );

  const sendJoin = useCallback(() => {
    sendMessage({
      type: 'join',
      activityId,
      memberName,
    });
  }, [activityId, memberName, sendMessage]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    sendAnnotation,
    sendPathMark,
    sendTrack,
    sendJoin,
    reconnect,
  };
}

export default useWebSocket;
