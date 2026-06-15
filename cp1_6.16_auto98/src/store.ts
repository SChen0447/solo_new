import { create } from 'zustand';

interface Version {
  id: string;
  documentId: string;
  content: string;
  versionNumber: number;
  createdAt: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  document: Document | null;
  versions: Version[];
  versionsTotal: number;
  versionsHasMore: boolean;
  versionsPage: number;
  activeVersionId: string | null;
  diffOpen: boolean;
  diffOldVersion: Version | null;
  diffNewVersion: Version | null;
  sidebarCollapsed: boolean;
  lastSavedTime: string | null;
  saveNotification: boolean;
  rollbackNotification: boolean;
  setDocument: (doc: Document) => void;
  setVersions: (versions: Version[], total: number, hasMore: boolean) => void;
  appendVersions: (versions: Version[], total: number, hasMore: boolean) => void;
  setVersionsPage: (page: number) => void;
  setActiveVersionId: (id: string | null) => void;
  setDiffOpen: (open: boolean) => void;
  setDiffVersions: (oldV: Version | null, newV: Version | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastSavedTime: (time: string | null) => void;
  setSaveNotification: (show: boolean) => void;
  setRollbackNotification: (show: boolean) => void;
}

const useStore = create<AppState>((set) => ({
  document: null,
  versions: [],
  versionsTotal: 0,
  versionsHasMore: false,
  versionsPage: 1,
  activeVersionId: null,
  diffOpen: false,
  diffOldVersion: null,
  diffNewVersion: null,
  sidebarCollapsed: false,
  lastSavedTime: null,
  saveNotification: false,
  rollbackNotification: false,
  setDocument: (doc) => set({ document: doc }),
  setVersions: (versions, total, hasMore) => set({ versions, versionsTotal: total, versionsHasMore: hasMore }),
  appendVersions: (newVersions, total, hasMore) =>
    set((state) => ({
      versions: [...state.versions, ...newVersions],
      versionsTotal: total,
      versionsHasMore: hasMore,
    })),
  setVersionsPage: (page) => set({ versionsPage: page }),
  setActiveVersionId: (id) => set({ activeVersionId: id }),
  setDiffOpen: (open) => set({ diffOpen: open }),
  setDiffVersions: (oldV, newV) => set({ diffOldVersion: oldV, diffNewVersion: newV }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setLastSavedTime: (time) => set({ lastSavedTime: time }),
  setSaveNotification: (show) => set({ saveNotification: show }),
  setRollbackNotification: (show) => set({ rollbackNotification: show }),
}));

export default useStore;
