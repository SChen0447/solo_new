import type { User, Room, Idea, WsMessage } from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data as T;
}

export function createRoom(): Promise<{ code: string }> {
  return request<{ code: string }>('/rooms', { method: 'POST' });
}

export function generateUser(): Promise<User> {
  return request<User>('/user', { method: 'POST' });
}

export function joinRoom(code: string, user: User): Promise<Room> {
  return request<Room>(`/rooms/${code}/join`, {
    method: 'POST',
    body: JSON.stringify({ user })
  });
}

export function getRoom(code: string): Promise<Room> {
  return request<Room>(`/rooms/${code}`);
}

export function submitIdea(code: string, content: string, userId: string, user: User): Promise<{ idea: Idea; ideas: Idea[] }> {
  return request<{ idea: Idea; ideas: Idea[] }>(`/rooms/${code}/ideas`, {
    method: 'POST',
    body: JSON.stringify({ content, userId, user })
  });
}

export function vote(code: string, ideaId: string, userId: string, voteType: 'up' | 'down'): Promise<{ idea: Idea; ideas: Idea[] }> {
  return request<{ idea: Idea; ideas: Idea[] }>(`/rooms/${code}/ideas/${ideaId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ userId, voteType })
  });
}

export function exportReport(code: string): Promise<any> {
  return request<any>(`/rooms/${code}/export`);
}

export function downloadReport(report: any, filename: string) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function connectWs(roomCode: string, userId: string, onMessage: (msg: WsMessage) => void): { close: () => void } {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws?room=${roomCode}&userId=${userId}`;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const connect = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      console.log('[WS] connected');
    };
    ws.onmessage = (e => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        onMessage(msg);
      } catch {
        console.error('[WS] parse error');
      }
    };
    ws.onclose = () => {
      console.log('[WS] closed');
      if (!closed && !reconnectTimer) {
        reconnectTimer = setTimeout(connect, 1500);
      }
    };
    ws.onerror = (err => {
      console.error('[WS] error', err);
    });
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws?.close();
    }
  };
}
