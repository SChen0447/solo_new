export interface CodeSnippet {
  html: string;
  css: string;
}

export type DiffType = 'added' | 'removed' | 'modified';

export interface DiffResult {
  type: DiffType;
  leftXPath: string;
  rightXPath: string;
  description: string;
}

export interface HighlightMap {
  left: Set<string>;
  right: Set<string>;
}

export interface CompareResult {
  diffs: DiffResult[];
  highlightMap: HighlightMap;
}

export interface PresetCase {
  id: string;
  name: string;
  left: CodeSnippet;
  right: CodeSnippet;
}

export interface EditorPanelProps {
  code: string;
  language: 'html' | 'css';
  onChange: (code: string) => void;
  onFormat: () => void;
  onCopy: () => void;
  error?: string | null;
  errorLine?: number;
}

export type RenderStatus = 'idle' | 'success' | 'error';
