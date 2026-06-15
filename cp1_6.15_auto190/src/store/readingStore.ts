import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
  shelfId: string | null;
  createdAt: string;
}

export interface ReadingRecord {
  id: string;
  bookId: string;
  date: string;
  durationMinutes: number;
  notes?: string;
}

export interface Shelf {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface ReadingStore {
  books: Book[];
  records: ReadingRecord[];
  shelves: Shelf[];
  activeModule: 'bookshelf' | 'calendar';
  sidebarCollapsed: boolean;

  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => void;
  removeBook: (id: string) => void;
  updateBookShelf: (bookId: string, shelfId: string | null) => void;

  addRecord: (record: Omit<ReadingRecord, 'id'>) => void;
  removeRecord: (id: string) => void;
  getRecordsByDate: (date: string) => ReadingRecord[];
  getTotalMinutesByDate: (date: string) => number;
  getWeeklySummary: (year: number, week: number) => { day: string; minutes: number }[];
  getMonthlySummary: (year: number, month: number) => { day: number; minutes: number }[];

  addShelf: (name: string, color?: string) => void;
  removeShelf: (id: string) => void;
  getBooksByShelf: (shelfId: string | null) => Book[];

  setActiveModule: (module: 'bookshelf' | 'calendar') => void;
  toggleSidebar: () => void;

  getBookById: (id: string) => Book | undefined;
}

const STORAGE_KEY = 'magic-book-pavilion-data';

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to load from storage');
  }
  return null;
};

const saveToStorage = (state: Partial<ReadingStore>) => {
  try {
    const data = {
      books: state.books,
      records: state.records,
      shelves: state.shelves,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to storage');
  }
};

const getInitialDemoData = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const book1Id = uuidv4();
  const book2Id = uuidv4();
  const book3Id = uuidv4();
  const shelf1Id = uuidv4();
  const shelf2Id = uuidv4();

  const records: ReadingRecord[] = [];
  for (let i = 1; i <= Math.min(day, 28); i++) {
    if (Math.random() > 0.3) {
      const bookIds = [book1Id, book2Id, book3Id];
      const numRecords = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numRecords; j++) {
        records.push({
          id: uuidv4(),
          bookId: bookIds[Math.floor(Math.random() * bookIds.length)],
          date: formatDate(year, month, i),
          durationMinutes: Math.floor(Math.random() * 150) + 10,
        });
      }
    }
  }

  return {
    books: [
      {
        id: book1Id,
        isbn: '9787020008735',
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9787020008735-M.jpg',
        shelfId: shelf1Id,
        createdAt: new Date().toISOString(),
      },
      {
        id: book2Id,
        isbn: '9787020022151',
        title: '红楼梦',
        author: '曹雪芹',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9787020022151-M.jpg',
        shelfId: shelf1Id,
        createdAt: new Date().toISOString(),
      },
      {
        id: book3Id,
        isbn: '9787532742004',
        title: '追风筝的人',
        author: '卡勒德·胡赛尼',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9787532742004-M.jpg',
        shelfId: shelf2Id,
        createdAt: new Date().toISOString(),
      },
    ],
    records,
    shelves: [
      { id: shelf1Id, name: '文学经典', color: '#8b5a2b', createdAt: new Date().toISOString() },
      { id: shelf2Id, name: '外国小说', color: '#5c6bc0', createdAt: new Date().toISOString() },
      { id: uuidv4(), name: '待读', color: '#66bb6a', createdAt: new Date().toISOString() },
    ],
  };
};

const stored = loadFromStorage();
const demoData = stored || getInitialDemoData();

export const useReadingStore = create<ReadingStore>((set, get) => ({
  books: demoData.books,
  records: demoData.records,
  shelves: demoData.shelves,
  activeModule: 'bookshelf',
  sidebarCollapsed: false,

  addBook: (book) => {
    const newBook: Book = {
      ...book,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const newState = { ...state, books: [...state.books, newBook] };
      saveToStorage(newState);
      return newState;
    });
  },

  removeBook: (id) => {
    set((state) => {
      const newState = {
        ...state,
        books: state.books.filter((b) => b.id !== id),
        records: state.records.filter((r) => r.bookId !== id),
      };
      saveToStorage(newState);
      return newState;
    });
  },

  updateBookShelf: (bookId, shelfId) => {
    set((state) => {
      const newState = {
        ...state,
        books: state.books.map((b) => (b.id === bookId ? { ...b, shelfId } : b)),
      };
      saveToStorage(newState);
      return newState;
    });
  },

  addRecord: (record) => {
    const newRecord: ReadingRecord = {
      ...record,
      id: uuidv4(),
    };
    set((state) => {
      const newState = { ...state, records: [...state.records, newRecord] };
      saveToStorage(newState);
      return newState;
    });
  },

  removeRecord: (id) => {
    set((state) => {
      const newState = {
        ...state,
        records: state.records.filter((r) => r.id !== id),
      };
      saveToStorage(newState);
      return newState;
    });
  },

  getRecordsByDate: (date) => get().records.filter((r) => r.date === date),

  getTotalMinutesByDate: (date) =>
    get()
      .records.filter((r) => r.date === date)
      .reduce((sum, r) => sum + r.durationMinutes, 0),

  getWeeklySummary: (year, week) => {
    const result = [] as { day: string; minutes: number }[];
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const firstDayOfYear = new Date(year, 0, 1);
    const startOfWeek = new Date(firstDayOfYear);
    startOfWeek.setDate(startOfWeek.getDate() + (week - 1) * 7 - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      result.push({
        day: days[i],
        minutes: get().getTotalMinutesByDate(dateStr),
      });
    }
    return result;
  },

  getMonthlySummary: (year, month) => {
    const result = [] as { day: number; minutes: number }[];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({
        day: d,
        minutes: get().getTotalMinutesByDate(dateStr),
      });
    }
    return result;
  },

  addShelf: (name, color) => {
    const colors = ['#8b5a2b', '#5c6bc0', '#66bb6a', '#ef5350', '#ffa726', '#26c6da'];
    const newShelf: Shelf = {
      id: uuidv4(),
      name,
      color: color || colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const newState = { ...state, shelves: [...state.shelves, newShelf] };
      saveToStorage(newState);
      return newState;
    });
  },

  removeShelf: (id) => {
    set((state) => {
      const newState = {
        ...state,
        shelves: state.shelves.filter((s) => s.id !== id),
        books: state.books.map((b) => (b.shelfId === id ? { ...b, shelfId: null } : b)),
      };
      saveToStorage(newState);
      return newState;
    });
  },

  getBooksByShelf: (shelfId) => get().books.filter((b) => b.shelfId === shelfId),

  setActiveModule: (module) => set({ activeModule: module }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  getBookById: (id) => get().books.find((b) => b.id === id),
}));
