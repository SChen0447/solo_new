export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type FileTransferStatus =
  | 'pending'
  | 'requesting'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  chunks?: ArrayBuffer[];
  receivedChunks?: ArrayBuffer[];
  totalChunks?: number;
  currentChunk?: number;
  transferredBytes?: number;
  status: FileTransferStatus;
  progress: number;
  speed: number;
  error?: string;
}

export interface IncomingFileRequest {
  fileId: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export interface AppState {
  roomCode: string | null;
  connectionStatus: ConnectionStatus;
  peerRole: 'host' | 'guest' | null;
  senderFiles: FileItem[];
  receiverFiles: FileItem[];
  incomingRequest: IncomingFileRequest | null;
  errorMessage: string | null;
  successMessage: string | null;
}

export interface AppActions {
  setRoomCode: (code: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPeerRole: (role: 'host' | 'guest' | null) => void;
  addSenderFiles: (files: File[]) => void;
  removeSenderFile: (id: string) => void;
  clearSenderFiles: () => void;
  updateSenderFile: (id: string, updates: Partial<FileItem>) => void;
  addReceiverFile: (file: FileItem) => void;
  updateReceiverFile: (id: string, updates: Partial<FileItem>) => void;
  clearReceiverFiles: () => void;
  setIncomingRequest: (req: IncomingFileRequest | null) => void;
  setError: (msg: string | null) => void;
  setSuccess: (msg: string | null) => void;
  resetAll: () => void;
}

export const CHUNK_SIZE = 64 * 1024;
export const MAX_FILE_SIZE = 500 * 1024 * 1024;
