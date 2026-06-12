import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import socketManager from '../socket/SocketManager';
import type { OnlineUser, ChatMessage } from '../../types';

interface CollaborationContextType {
  ydoc: Y.Doc;
  awareness: any;
  onlineUsers: OnlineUser[];
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  sendCursorUpdate: (cursor: any) => void;
  cursors: Map<string, { cursor: any; user: OnlineUser }>;
  currentUser: OnlineUser;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function useCollaboration(): CollaborationContextType {
  const ctx = useContext(CollaborationContext);
  if (!ctx) throw new Error('useCollaboration must be used within CollaborationProvider');
  return ctx;
}

interface Props {
  docId: string;
  user: OnlineUser;
  children: React.ReactNode;
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function CollaborationProvider({ docId, user, children }: Props) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const awarenessRef = useRef<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [cursors, setCursors] = useState<Map<string, { cursor: any; user: OnlineUser }>>(new Map());
  const onlineUsersRef = useRef<OnlineUser[]>([]);
  const lastSentStateRef = useRef<Uint8Array | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdateRef = useRef<boolean>(false);

  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  useEffect(() => {
    const ydoc = ydocRef.current;
    awarenessRef.current = ydoc.getMap('awareness');
    socketManager.connect();
    socketManager.joinDoc(docId, user);

    const handleDocUpdate = (update: ArrayBuffer) => {
      try {
        const u8 = new Uint8Array(update);
        Y.applyUpdate(ydoc, u8);
        lastSentStateRef.current = Y.encodeStateAsUpdate(ydoc);
      } catch (e) {
        console.error('[Collaboration] apply update error:', e);
      }
    };

    const handleOnlineUsers = (users: OnlineUser[]) => {
      setOnlineUsers(users);
    };

    const handleChatHistory = (messages: ChatMessage[]) => {
      setChatMessages(messages);
    };

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleCursorUpdate = (data: { userId: string; cursor: any }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        const onlineUser = onlineUsersRef.current.find((u) => u.id === data.userId);
        if (onlineUser) {
          next.set(data.userId, { cursor: data.cursor, user: onlineUser });
        }
        return next;
      });
    };

    socketManager.on('doc-update', handleDocUpdate);
    socketManager.on('online-users', handleOnlineUsers);
    socketManager.on('chat-history', handleChatHistory);
    socketManager.on('chat-message', handleChatMessage);
    socketManager.on('cursor-update', handleCursorUpdate);

    const sendDebouncedUpdate = debounce(() => {
      const currentState = Y.encodeStateAsUpdate(ydoc);
      const last = lastSentStateRef.current;
      let diff = currentState;
      if (last) {
        try {
          diff = Y.encodeStateAsUpdate(ydoc, last);
        } catch {
          diff = currentState;
        }
      }
      if (diff.byteLength > 0) {
        socketManager.sendDocUpdate(docId, diff.buffer as ArrayBuffer);
      }
      lastSentStateRef.current = currentState;
      pendingUpdateRef.current = false;
    }, 50);

    const yObserver = (_update: Uint8Array, origin: any) => {
      if (origin === 'remote') return;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      pendingUpdateRef.current = true;
      sendDebouncedUpdate();
    };

    ydoc.on('update', yObserver);

    return () => {
      ydoc.off('update', yObserver);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      socketManager.off('doc-update', handleDocUpdate);
      socketManager.off('online-users', handleOnlineUsers);
      socketManager.off('chat-history', handleChatHistory);
      socketManager.off('chat-message', handleChatMessage);
      socketManager.off('cursor-update', handleCursorUpdate);
    };
  }, [docId, user.id]);

  const sendChatMessage = useCallback(
    (content: string) => {
      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        userId: user.id,
        userName: user.name,
        content,
        timestamp: Date.now(),
      };
      socketManager.sendChatMessage(docId, msg);
    },
    [docId, user.id, user.name]
  );

  const sendCursorUpdate = useCallback(
    (cursor: any) => {
      if (awarenessRef.current) {
        try {
          awarenessRef.current.set(user.id, { user, cursor });
        } catch {}
      }
      socketManager.sendCursorUpdate(docId, user.id, cursor);
    },
    [docId, user.id, user]
  );

  const value: CollaborationContextType = {
    ydoc: ydocRef.current,
    awareness: awarenessRef.current,
    onlineUsers,
    chatMessages,
    sendChatMessage,
    sendCursorUpdate,
    cursors,
    currentUser: user,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
