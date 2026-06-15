import { CHUNK_SIZE } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return parseFloat((bytesPerSecond / Math.pow(k, idx)).toFixed(2)) + ' ' + sizes[idx];
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

export function getFileIconColor(type: string): string {
  const ext = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '#fd7e14';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)) return '#e83e8c';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '#6f42c1';
  if (['pdf'].includes(ext)) return '#dc3545';
  if (['doc', 'docx'].includes(ext)) return '#0d6efd';
  if (['xls', 'xlsx'].includes(ext)) return '#198754';
  if (['ppt', 'pptx'].includes(ext)) return '#fd7e14';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#ffc107';
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'go', 'rs', 'cpp', 'c'].includes(ext)) return '#20c997';
  return '#6c757d';
}

export function getFileCategoryName(type: string): string {
  const ext = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '图片';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)) return '视频';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '音频';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return '文档';
  if (['xls', 'xlsx'].includes(ext)) return '表格';
  if (['ppt', 'pptx'].includes(ext)) return '演示';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '压缩包';
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'go', 'rs', 'cpp', 'c'].includes(ext)) return '代码';
  return '文件';
}

export async function sliceFileIntoChunks(file: File): Promise<ArrayBuffer[]> {
  const chunks: ArrayBuffer[] = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);
    const buffer = await blob.arrayBuffer();
    chunks.push(buffer);
  }
  return chunks;
}

export function assembleChunksToBlob(chunks: ArrayBuffer[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType });
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
