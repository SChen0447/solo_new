export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface Agenda {
  id: string;
  meetingId: string;
  title: string;
  estimatedDuration: number;
  notes: string;
  status: 'pending' | 'completed' | 'skipped';
  actualDuration: number;
  order: number;
  startedAt?: string;
}

export interface Meeting {
  id: string;
  title: string;
  dateTime: string;
  participantIds: string[];
  agendas: Agenda[];
  status: 'scheduled' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: string;
  todoCount?: number;
  completedTodoCount?: number;
  completionRate?: number;
  todos?: TodoItem[];
  report?: Report | null;
}

export interface TodoItem {
  id: string;
  meetingId: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  completed: boolean;
}

export interface Report {
  id: string;
  meetingId: string;
  summary: string;
  createdAt: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export type SaveStatus = 'unsaved' | 'saving' | 'saved';
