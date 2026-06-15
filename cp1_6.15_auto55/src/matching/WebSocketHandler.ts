import { io, Socket } from 'socket.io-client';
import { MatchResult, ChatMessage, TodoItem, ProjectPlan, InviteNotification } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

type MessageHandler = (data: unknown) => void;

export class WebSocketHandler {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();

  connect(userId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: { userId }
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
    });

    this.socket.on('match:result', (data: { matches: MatchResult[] }) => {
      useAppStore.getState().setMatches(data.matches);
    });

    this.socket.on('team:invited', (data: InviteNotification) => {
      useAppStore.getState().addNotification(data);
    });

    this.socket.on('team:accepted', (data: { team: unknown }) => {
      useAppStore.getState().setCurrentTeam(data.team as never);
      useAppStore.getState().showToast('组队成功！进入协作工作台', 'success');
    });

    this.socket.on('team:declined', () => {
      useAppStore.getState().showToast('对方暂未接受组队邀请', 'info');
    });

    this.socket.on('chat:message', (message: ChatMessage) => {
      const team = useAppStore.getState().currentTeam;
      if (team) {
        useAppStore.getState().updateTeam({
          messages: [...team.messages, message]
        });
      }
    });

    this.socket.on('todo:updated', (todos: TodoItem[]) => {
      useAppStore.getState().updateTeam({ todos });
    });

    this.socket.on('notes:updated', (data: { content: string; editorId: string }) => {
      const curUserId = useAppStore.getState().currentUser.id;
      if (data.editorId !== curUserId) {
        useAppStore.getState().updateTeam({ notes: data.content });
      }
    });

    this.socket.on('plan:updated', (data: { plan: ProjectPlan; editorId: string }) => {
      const curUserId = useAppStore.getState().currentUser.id;
      if (data.editorId !== curUserId) {
        useAppStore.getState().updateTeam({ projectPlan: data.plan });
      }
    });

    this.socket.on('plan:conflict', (data: { latestPlan: ProjectPlan; warning: string }) => {
      useAppStore.getState().updateTeam({ projectPlan: data.latestPlan });
      useAppStore.getState().showToast(data.warning, 'error');
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  requestMatch(userId: string, tags: string[], ideaId: string) {
    this.socket?.emit('match:request', { userId, tags, ideaId });
  }

  sendTeamInvite(fromUserId: string, toUserId: string, ideaId: string) {
    this.socket?.emit('team:invite', { fromUserId, toUserId, ideaId });
  }

  acceptTeam(teamId: string, userId: string) {
    this.socket?.emit('team:accept', { teamId, userId });
  }

  declineTeam(teamId: string, userId: string) {
    this.socket?.emit('team:decline', { teamId, userId });
  }

  sendChat(teamId: string, message: ChatMessage) {
    this.socket?.emit('chat:send', { teamId, message });
  }

  updateTodos(teamId: string, todos: TodoItem[]) {
    this.socket?.emit('todo:update', { teamId, todos });
  }

  updateNotes(teamId: string, content: string) {
    this.socket?.emit('notes:update', { teamId, content });
  }

  updatePlan(teamId: string, plan: ProjectPlan, editorId: string) {
    this.socket?.emit('plan:update', { teamId, plan, editorId });
  }
}

export const wsHandler = new WebSocketHandler();
