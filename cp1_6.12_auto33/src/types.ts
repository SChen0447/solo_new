export interface Version {
  id: string;
  content: string;
  label: string;
  comment: string;
  createdAt: number;
}

export interface VersionMeta {
  id: string;
  label: string;
  comment: string;
  createdAt: number;
}

export interface DiffSegment {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  value: string;
  oldValue?: string;
}

export interface DiffResult {
  segments: DiffSegment[];
}
