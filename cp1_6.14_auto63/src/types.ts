export type BookCategory = '文学' | '科普' | '历史' | '哲学' | '艺术';
export type BookStatus = '待借出' | '流转中' | '已完成';

export interface CirculationLogEntry {
  holder: string;
  date: string;
  action: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  category: BookCategory;
  currentHolder: string | null;
  status: BookStatus;
  rotationQueue: string[];
  circulationLog: CirculationLogEntry[];
  totalPages: number;
  progress?: ProgressUpdate[];
}

export interface Member {
  id: string;
  name: string;
  heldBooks?: Book[];
  progressUpdates?: ProgressUpdate[];
}

export interface ProgressUpdate {
  id: string;
  bookId: string;
  memberId: string;
  currentPage: number;
  totalPages: number;
  notes: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  topic: string;
  dateTime: string;
  bookId: string | null;
  location: string;
  participants: string[];
  createdAt: string;
}

export interface MemberStats {
  memberId: string;
  memberName: string;
  totalPagesRead: number;
  avgDaysPerBook: number;
  meetingCount: number;
  booksCompleted: number;
}
