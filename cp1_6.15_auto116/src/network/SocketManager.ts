import { io, Socket } from 'socket.io-client';
import { useGalleryStore } from '@/store/useGalleryStore';
import type { Message, User, UserPosition, Artwork } from '@/types';

class SocketManager {
  private socket: Socket | null = null;
  private moveInterval: number | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io({
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('user_joined', (data: { user: User; onlineCount: number }) => {
      const { setCurrentUser, setOnlineUsers } = useGalleryStore.getState();
      setCurrentUser(data.user);
    });

    this.socket.on('user_connected', (data: { user: User; onlineCount: number }) => {
      const { addOnlineUser } = useGalleryStore.getState();
      addOnlineUser(data.user);
    });

    this.socket.on('users_list', (users: User[]) => {
      const { setOnlineUsers, currentUser } = useGalleryStore.getState();
      const filteredUsers = currentUser
        ? users.filter((u) => u.id !== currentUser.id)
        : users;
      setOnlineUsers(filteredUsers);
    });

    this.socket.on('user_disconnected', (data: { userId: string; onlineCount: number }) => {
      const { removeOnlineUser } = useGalleryStore.getState();
      removeOnlineUser(data.userId);
    });

    this.socket.on('new_message', (message: Message) => {
      const { addMessage } = useGalleryStore.getState();
      addMessage(message);
    });

    this.socket.on('user_position_updated', (data: { userId: string; position: UserPosition }) => {
      const { updateUserPosition } = useGalleryStore.getState();
      updateUserPosition(data.userId, data.position);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.stopPositionBroadcast();
    });
  }

  disconnect(): void {
    this.stopPositionBroadcast();
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(content: string): void {
    if (!this.socket?.connected || !content.trim()) return;
    this.socket.emit('send_message', { content });
  }

  sendPosition(position: UserPosition): void {
    if (!this.socket?.connected) return;
    this.socket.emit('user_moved', position);
  }

  startPositionBroadcast(getPosition: () => UserPosition): void {
    this.stopPositionBroadcast();
    this.moveInterval = window.setInterval(() => {
      const position = getPosition();
      this.sendPosition(position);
    }, 100);
  }

  stopPositionBroadcast(): void {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketManager = new SocketManager();

export async function fetchArtworks(): Promise<Artwork[]> {
  const response = await fetch('/api/artworks');
  if (!response.ok) {
    throw new Error('Failed to fetch artworks');
  }
  return response.json();
}

export async function fetchMessages(): Promise<Message[]> {
  const response = await fetch('/api/messages');
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
}
