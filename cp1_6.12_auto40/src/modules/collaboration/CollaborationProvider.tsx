import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import socketManager from '../socket/SocketManager';
import type { OnlineUser, ChatMessage } from '../../types';

interface CollaborationContextType {
  ydoc: Y.Doc;
  onlineUsers: OnlineUser[];
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  sendCursorUpdate: (cursor: any) => void;
  cursors: Map<string, { cursor: any; user: OnlineUser }>;
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

export function CollaborationProvider({ docId, user, children }: Props) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [cursors, setCursors] = useState<Map<string, { cursor: any; user: OnlineUser }>>(new Map());

  useEffect(() => {
    const ydoc = ydocRef.current;
    const socket = socketManager.connect();

    socketManager.joinDoc(docId, user);

    const handleDocUpdate = (update: ArrayBuffer) => {
      try {
        Y.applyUpdate(ydoc, new Uint8Array(update));
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
      setChatMessages((prev) => [...prev, message]);
    };

    const handleCursorUpdate = (data: { userId: string; cursor: any }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        const onlineUser = onlineUsers.find((u) => u.id === data.userId);
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

    const yObserver = () => {
      const update = Y.encodeStateAsUpdate(ydoc);
      socketManager.sendDocUpdate(docId, update.buffer as ArrayBuffer);
    };

    ydoc.on('update', yObserver);

    return () => {
      ydoc.off('update', yObserver);
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
        id: Math.random().toString(36).slice(2),
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
      socketManager.sendCursorUpdate(docId, user.id, cursor);
    },
    [docId, user.id]
  );

  const value: CollaborationContextType = {
    ydoc: ydocRef.current,
    onlineUsers,
    chatMessages,
    sendChatMessage,
    sendCursorUpdate,
    cursors,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
