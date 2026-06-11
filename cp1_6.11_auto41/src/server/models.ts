export interface Bubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: 'ellipse' | 'rectangle' | 'cloud';
}

export interface ComicPage {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl: string;
  bubbles: Bubble[];
  createdAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  chapterNumber: number;
  pages: ComicPage[];
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  artistId: string;
  artistName: string;
  chapters: Chapter[];
  isPublished: boolean;
  createdAt: string;
}

export interface Like {
  id: string;
  pageId: string;
  readerId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  pageId: string;
  readerName: string;
  content: string;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  createdAt: string;
}

export interface DailyLike {
  date: string;
  count: number;
}

export const projects: Project[] = [];
export const likes: Like[] = [];
export const comments: Comment[] = [];
export const dailyLikes: Map<string, DailyLike[]> = new Map();
