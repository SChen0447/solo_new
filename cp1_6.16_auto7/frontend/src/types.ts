export interface UploadedImage {
  id: string;
  filename: string;
  size: number;
  thumbnail: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface WatermarkConfigType {
  type: 'text' | 'image';
  text: string;
  font_size: number;
  font_color: string;
  opacity: number;
  position: string;
  scale: number;
}

export interface JobStatus {
  job_id: string;
  total: number;
  completed: number;
  failed: number;
  progress: number;
  statuses: Record<string, string>;
  errors: Record<string, string>;
  is_complete: boolean;
}

export interface BatchProcessState {
  isProcessing: boolean;
  jobId: string | null;
  progress: number;
  completed: number;
  failed: number;
  total: number;
  isComplete: boolean;
  downloadProgress: number;
  error: string | null;
  statuses: Record<string, UploadedImage['status']>;
  errors: Record<string, string>;
}

export const POSITION_OPTIONS = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '顶部' },
  { value: 'top-right', label: '右上' },
  { value: 'center-left', label: '左侧' },
  { value: 'center', label: '居中' },
  { value: 'center-right', label: '右侧' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '底部' },
  { value: 'bottom-right', label: '右下' },
];
