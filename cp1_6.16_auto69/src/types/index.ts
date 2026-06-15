export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CodeBlock {
  id: string;
  language: 'javascript' | 'typescript' | 'python';
  filename: string;
  code: string;
  output: string;
  collapsed: boolean;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
  line: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  type?: string;
  description?: string;
}

export interface Response {
  description: string;
  content?: Record<string, { schema?: unknown; example?: unknown }>;
}

export interface Operation {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: unknown; example?: unknown }>;
    required?: boolean;
  };
  responses?: Record<string, Response>;
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  [key: string]: Operation | undefined;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
}

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  parameters: Parameter[];
  responses: Record<string, Response>;
  requestBody?: Operation['requestBody'];
}

export interface ExportProgress {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

export type ExportFormat = 'pdf' | 'markdown';

export interface AppState {
  documentContent: string;
  documentTitle: string;
  splitRatio: number;
  isFullscreen: boolean;
  showExportDialog: boolean;
  apiEndpoints: ApiEndpoint[];
  highlightedLine: number | null;
  codeBlocks: Record<string, CodeBlock>;
  setDocumentContent: (content: string) => void;
  setDocumentTitle: (title: string) => void;
  setSplitRatio: (ratio: number) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setShowExportDialog: (show: boolean) => void;
  setApiEndpoints: (endpoints: ApiEndpoint[]) => void;
  setHighlightedLine: (line: number | null) => void;
  updateCodeBlock: (id: string, updates: Partial<CodeBlock>) => void;
  addCodeBlock: (block: CodeBlock) => void;
}
