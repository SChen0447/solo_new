export type CardStatus = 'todo' | 'in_progress' | 'done';

export interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  date: string;
  assignee: string;
  status: CardStatus;
  checklist: CheckItem[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'kanban' | 'timeline';
