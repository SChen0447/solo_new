export interface MindMapNode {
  id: string;
  text: string;
  note?: string;
  children: MindMapNode[];
  collapsed?: boolean;
  x?: number;
  y?: number;
}

export interface KeywordEntry {
  word: string;
  related: string[];
}

export interface TemplateEntry {
  category: string;
  levels: string[][];
}
