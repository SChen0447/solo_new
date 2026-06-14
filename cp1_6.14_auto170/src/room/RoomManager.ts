import { apiClient } from '../api/apiClient';
import { useAppStore } from '../store';

export const RoomManager = {
  async createRoom(nickname: string) {
    const data = await apiClient.createRoom(nickname);
    const store = useAppStore.getState();
    store.setMemberId(data.memberId);
    store.setNickname(nickname);
    store.setRoom(data.room);
    store.setView('room');
    return data;
  },

  async joinRoom(roomId: string, nickname: string) {
    const data = await apiClient.joinRoom(roomId, nickname);
    const store = useAppStore.getState();
    store.setMemberId(data.memberId);
    store.setNickname(nickname);
    store.setRoom(data.room);
    store.setView('room');
    return data;
  },

  async refreshRoom() {
    const { room } = useAppStore.getState();
    if (!room) return;
    try {
      const data = await apiClient.getRoom(room.id);
      useAppStore.getState().setRoom(data.room);
    } catch {
      // room may not exist
    }
  },

  async startGame() {
    const { room } = useAppStore.getState();
    if (!room) return;
    const store = useAppStore.getState();
    store.setCountdown(10);
    store.setRoom({ ...room, status: 'countdown' });
  },

  async confirmStart() {
    const { room } = useAppStore.getState();
    if (!room) return;
    const data = await apiClient.startGame(room.id);
    useAppStore.getState().setRoom(data.room);
  },

  async leaveRoom() {
    const { room, memberId } = useAppStore.getState();
    if (!room || !memberId) return;
    await apiClient.leaveRoom(room.id, memberId);
    useAppStore.getState().setRoom(null);
    useAppStore.getState().setMemberId(null);
    useAppStore.getState().setView('lobby');
  },

  async resetRoom() {
    const { room } = useAppStore.getState();
    if (!room) return;
    const data = await apiClient.resetRoom(room.id);
    useAppStore.getState().setRoom(data.room);
  },

  startPolling(intervalMs: number = 2000): ReturnType<typeof setInterval> {
    return setInterval(() => {
      RoomManager.refreshRoom();
    }, intervalMs);
  },

  stopPolling(timer: ReturnType<typeof setInterval>) {
    clearInterval(timer);
  },
};
