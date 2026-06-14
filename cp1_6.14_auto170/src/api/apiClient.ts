export interface Member {
  id: string;
  nickname: string;
  avatar: string;
  online: boolean;
}

export interface Lyric {
  id: string;
  roomId: string;
  memberId: string;
  memberNickname: string;
  content: string;
  keyword: string;
  timestamp: number;
}

export interface Room {
  id: string;
  members: Member[];
  currentTurnIndex: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  lyrics: Lyric[];
  createdAt: number;
}

export interface CreateRoomResponse {
  room: Room;
  memberId: string;
}

export interface JoinRoomResponse {
  room: Room;
  memberId: string;
}

export interface SubmitLyricResponse {
  room: Room;
  lyric: Lyric;
}

export interface LyricsResponse {
  lyrics: Lyric[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  createRoom(nickname: string): Promise<CreateRoomResponse> {
    return request<CreateRoomResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    });
  },

  joinRoom(roomId: string, nickname: string): Promise<JoinRoomResponse> {
    return request<JoinRoomResponse>('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomId, nickname }),
    });
  },

  getRoom(roomId: string): Promise<{ room: Room }> {
    return request<{ room: Room }>(`/api/rooms/${roomId}`);
  },

  startGame(roomId: string): Promise<{ room: Room }> {
    return request<{ room: Room }>(`/api/rooms/${roomId}/start`, {
      method: 'POST',
    });
  },

  submitLyric(roomId: string, memberId: string, content: string, keyword: string): Promise<SubmitLyricResponse> {
    return request<SubmitLyricResponse>(`/api/rooms/${roomId}/lyrics`, {
      method: 'POST',
      body: JSON.stringify({ memberId, content, keyword }),
    });
  },

  getLyrics(roomId: string): Promise<LyricsResponse> {
    return request<LyricsResponse>(`/api/rooms/${roomId}/lyrics`);
  },

  leaveRoom(roomId: string, memberId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  },

  exportRoom(roomId: string, format: 'text' | 'html' = 'text'): string {
    return `/api/rooms/${roomId}/export?format=${format}`;
  },

  resetRoom(roomId: string): Promise<{ room: Room }> {
    return request<{ room: Room }>(`/api/rooms/${roomId}/reset`, {
      method: 'POST',
    });
  },
};
