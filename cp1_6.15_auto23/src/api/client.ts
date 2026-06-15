import axios, { type AxiosProgressEvent } from 'axios';
import type { AudioFile, Annotation, AnnotationVersion, VersionDiff, ApiResponse, LabelType } from '../../shared/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export async function uploadAudio(
  file: File,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<AudioFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('duration', duration.toString());

  const response = await api.post<ApiResponse<AudioFile>>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentage);
      }
    },
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '上传失败');
  }

  return response.data.data;
}

export async function getAudioInfo(audioId: string): Promise<AudioFile> {
  const response = await api.get<ApiResponse<AudioFile>>(`/audio/${audioId}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '获取音频信息失败');
  }
  return response.data.data;
}

export async function createAnnotation(data: {
  audioId: string;
  startTime: number;
  endTime: number;
  content: string;
  color: string;
  labelType: LabelType;
}): Promise<Annotation> {
  const response = await api.post<ApiResponse<Annotation>>('/annotations', data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '创建批注失败');
  }
  return response.data.data;
}

export async function getAnnotations(audioId: string): Promise<Annotation[]> {
  const response = await api.get<ApiResponse<Annotation[]>>(`/annotations/${audioId}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '获取批注失败');
  }
  return response.data.data;
}

export async function updateAnnotation(
  id: string,
  audioId: string,
  data: Partial<Annotation>
): Promise<Annotation> {
  const response = await api.put<ApiResponse<Annotation>>(`/annotations/${id}`, {
    audioId,
    ...data,
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '更新批注失败');
  }
  return response.data.data;
}

export async function deleteAnnotation(id: string, audioId: string): Promise<boolean> {
  const response = await api.delete<ApiResponse<boolean>>(`/annotations/${id}`, {
    data: { audioId },
  });
  if (!response.data.success) {
    throw new Error(response.data.error || '删除批注失败');
  }
  return true;
}

export async function createVersion(
  audioId: string,
  annotations: Annotation[],
  description?: string
): Promise<AnnotationVersion> {
  const response = await api.post<ApiResponse<AnnotationVersion>>('/versions', {
    audioId,
    annotations,
    description,
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '创建版本失败');
  }
  return response.data.data;
}

export async function getVersions(audioId: string): Promise<AnnotationVersion[]> {
  const response = await api.get<ApiResponse<AnnotationVersion[]>>(`/versions/${audioId}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '获取版本列表失败');
  }
  return response.data.data;
}

export async function compareVersions(
  audioId: string,
  baseId: string,
  compareId: string
): Promise<VersionDiff> {
  const response = await api.get<ApiResponse<VersionDiff>>('/versions/compare', {
    params: { audioId, baseId, compareId },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '版本对比失败');
  }
  return response.data.data;
}

export async function getVersionDetail(versionId: string, audioId: string): Promise<AnnotationVersion> {
  const response = await api.get<ApiResponse<AnnotationVersion>>(`/versions/detail/${versionId}`, {
    params: { audioId },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || '获取版本详情失败');
  }
  return response.data.data;
}

export default api;
