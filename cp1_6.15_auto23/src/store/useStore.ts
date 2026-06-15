import { create } from 'zustand';
import type { AudioFile, Annotation, AnnotationVersion, VersionDiff, LabelType } from '../../shared/types';

type PanelType = 'upload' | 'annotations' | 'versions';

interface Selection {
  startTime: number;
  endTime: number;
}

interface AppState {
  currentAudio: AudioFile | null;
  annotations: Annotation[];
  versions: AnnotationVersion[];
  currentVersion: AnnotationVersion | null;
  versionDiff: VersionDiff | null;
  compareMode: boolean;
  selectedBaseVersion: string | null;
  selectedCompareVersion: string | null;
  activePanel: PanelType;
  selection: Selection | null;
  isLoading: boolean;
  uploadProgress: number;
  error: string | null;

  setCurrentAudio: (audio: AudioFile | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, data: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setVersions: (versions: AnnotationVersion[]) => void;
  setCurrentVersion: (version: AnnotationVersion | null) => void;
  setVersionDiff: (diff: VersionDiff | null) => void;
  setCompareMode: (mode: boolean) => void;
  setSelectedBaseVersion: (id: string | null) => void;
  setSelectedCompareVersion: (id: string | null) => void;
  setActivePanel: (panel: PanelType) => void;
  setSelection: (selection: Selection | null) => void;
  setIsLoading: (loading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState: Partial<AppState> = {
  currentAudio: null,
  annotations: [],
  versions: [],
  currentVersion: null,
  versionDiff: null,
  compareMode: false,
  selectedBaseVersion: null,
  selectedCompareVersion: null,
  activePanel: 'upload',
  selection: null,
  isLoading: false,
  uploadProgress: 0,
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState as AppState,

  setCurrentAudio: (audio) => set({ currentAudio: audio }),
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, data) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a
      ),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    })),
  setVersions: (versions) => set({ versions }),
  setCurrentVersion: (version) => set({ currentVersion: version }),
  setVersionDiff: (diff) => set({ versionDiff: diff }),
  setCompareMode: (mode) => set({ compareMode: mode }),
  setSelectedBaseVersion: (id) => set({ selectedBaseVersion: id }),
  setSelectedCompareVersion: (id) => set({ selectedCompareVersion: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelection: (selection) => set({ selection }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setError: (error) => set({ error }),
  resetState: () => set(initialState as AppState),
}));

export default useAppStore;
