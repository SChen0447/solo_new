export interface AudioFile {
  id: string;
  name: string;
  duration: number;
  size: number;
  format: 'mp3' | 'wav';
  createdAt: string;
  filePath: string;
}

export type LabelType = 'vocal' | 'instrument' | 'rhythm' | 'mix';

export interface Annotation {
  id: string;
  audioId: string;
  startTime: number;
  endTime: number;
  content: string;
  color: string;
  labelType: LabelType;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationVersion {
  id: string;
  audioId: string;
  versionNumber: number;
  annotations: Annotation[];
  createdAt: string;
  description?: string;
}

export interface VersionDiff {
  added: Annotation[];
  removed: Annotation[];
  modified: Annotation[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const LABEL_COLORS: Record<LabelType, string> = {
  vocal: '#e74c3c',
  instrument: '#3498db',
  rhythm: '#f39c12',
  mix: '#2ecc71',
};

export const LABEL_NAMES: Record<LabelType, string> = {
  vocal: '人声',
  instrument: '乐器',
  rhythm: '节奏',
  mix: '混音',
};
