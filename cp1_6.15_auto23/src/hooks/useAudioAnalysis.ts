import { useState, useCallback } from 'react';

interface AudioAnalysisResult {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  bitRate?: number;
}

interface UseAudioAnalysisReturn {
  analyzeFile: (file: File) => Promise<AudioAnalysisResult>;
  isAnalyzing: boolean;
  error: string | null;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = useCallback(async (file: File): Promise<AudioAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const result: AudioAnalysisResult = {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
      };

      await audioContext.close();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '音频解析失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analyzeFile,
    isAnalyzing,
    error,
  };
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const handleLoad = () => {
      window.URL.revokeObjectURL(audio.src);
      cleanup();
      resolve(audio.duration);
    };

    const handleError = () => {
      cleanup();
      reject(new Error('无法获取音频时长'));
    };

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', handleLoad);
      audio.removeEventListener('error', handleError);
    };

    audio.addEventListener('loadedmetadata', handleLoad);
    audio.addEventListener('error', handleError);
    audio.src = URL.createObjectURL(file);
  });
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 20 * 1024 * 1024;
  const allowedExtensions = ['.mp3', '.wav'];
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave'];

  const ext = file.name.toLowerCase().slice(-4);

  if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
    return { valid: false, error: '仅支持MP3和WAV格式' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: '文件大小不能超过20MB' };
  }

  if (file.size === 0) {
    return { valid: false, error: '文件不能为空' };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default useAudioAnalysis;
