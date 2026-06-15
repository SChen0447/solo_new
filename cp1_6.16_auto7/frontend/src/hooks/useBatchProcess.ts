import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadedImage, WatermarkConfigType, BatchProcessState, JobStatus } from '../types';

const POLL_INTERVAL = 1000;

export function useBatchProcess() {
  const [state, setState] = useState<BatchProcessState>({
    isProcessing: false,
    jobId: null,
    progress: 0,
    completed: 0,
    failed: 0,
    total: 0,
    isComplete: false,
    downloadProgress: 0,
    error: null,
    statuses: {},
    errors: {},
  });

  const pollTimerRef = useRef<number | null>(null);
  const pollActiveRef = useRef(false);

  const uploadImage = useCallback(async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const thumbnail = await generateThumbnail(file);

    return {
      id: response.data.id,
      filename: response.data.filename,
      size: response.data.size,
      thumbnail,
      status: 'pending',
    };
  }, []);

  const startProcessing = useCallback(
    async (
      imageIds: string[],
      config: WatermarkConfigType,
      watermarkImageId?: string
    ): Promise<void> => {
      const initialStatuses: Record<string, UploadedImage['status']> = {};
      imageIds.forEach(id => {
        initialStatuses[id] = 'pending';
      });
      setState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 0,
        completed: 0,
        failed: 0,
        total: imageIds.length,
        isComplete: false,
        error: null,
        downloadProgress: 0,
        statuses: initialStatuses,
        errors: {},
      }));

      try {
        const response = await axios.post('/api/process', {
          image_ids: imageIds,
          config,
          watermark_image_id: watermarkImageId || null,
        });

        const jobId = response.data.job_id;
        setState(prev => ({ ...prev, jobId }));

        pollActiveRef.current = true;
        startPolling(jobId);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Processing failed',
        }));
      }
    },
    []
  );

  const startPolling = useCallback((jobId: string) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    const poll = async () => {
      if (!pollActiveRef.current) return;

      try {
        const response = await axios.get<JobStatus>(`/api/status/${jobId}`);
        const data = response.data;

        setState(prev => ({
        ...prev,
        progress: data.progress,
        completed: data.completed,
        failed: data.failed,
        total: data.total,
        isComplete: data.is_complete,
        statuses: data.statuses as Record<string, UploadedImage['status']>,
        errors: data.errors,
      }));

        if (data.is_complete) {
          pollActiveRef.current = false;
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    poll();
    pollTimerRef.current = window.setInterval(poll, POLL_INTERVAL);
  }, []);

  const downloadAll = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        setState(prev => ({ ...prev, downloadProgress: 0 }));

        const response = await axios.get(`/api/download/${jobId}`, {
          responseType: 'blob',
          onDownloadProgress: progressEvent => {
            if (progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              setState(prev => ({ ...prev, downloadProgress: progress }));
            }
          },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers['content-disposition'];
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'watermarked_images.zip';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Download failed',
        }));
      }
    },
    []
  );

  const deleteImage = useCallback(async (imageId: string): Promise<void> => {
    await axios.delete(`/api/images/${imageId}`);
  }, []);

  const reset = useCallback(() => {
    pollActiveRef.current = false;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setState({
      isProcessing: false,
      jobId: null,
      progress: 0,
      completed: 0,
      failed: 0,
      total: 0,
      isComplete: false,
      downloadProgress: 0,
      error: null,
      statuses: {},
      errors: {},
    });
  }, []);

  useEffect(() => {
    return () => {
      pollActiveRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    uploadImage,
    startProcessing,
    downloadAll,
    deleteImage,
    reset,
  };
}

function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
