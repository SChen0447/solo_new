export interface MindMapNode {
  id: string;
  text: string;
  note?: string;
  children: MindMapNode[];
  collapsed?: boolean;
  x?: number;
  y?: number;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface GenerateResponse {
  success: boolean;
  data: MindMapNode;
}

export interface KeywordsResponse {
  success: boolean;
  data: string[];
}
