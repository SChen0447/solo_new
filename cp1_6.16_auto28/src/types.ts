export type DiffType = 'equal' | 'added' | 'removed' | 'modified';

export interface ParagraphDiff {
  id: string;
  type: DiffType;
  contentA: string;
  contentB: string;
  indexA: number;
  indexB: number;
}

export interface ConflictResolution {
  conflictId: string;
  resolvedContent: string;
  source: 'A' | 'B' | 'manual';
}

export interface HistoryState {
  resolutions: Record<string, ConflictResolution>;
  description: string;
}
