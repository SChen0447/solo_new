import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileAudio, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadAudio, getAnnotations } from '../api/client';
import { useAppStore } from '../store/useStore';
import { validateAudioFile, formatFileSize, getAudioDuration } from '../hooks/useAudioAnalysis';
import { formatTime } from '../utils/waveform';

const AudioUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const {
    currentAudio,
    uploadProgress,
    setCurrentAudio,
    setUploadProgress,
    setActivePanel,
    setError,
    setAnnotations,
    setIsLoading,
  } = useAppStore();

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setSelectedFile(null);
    setAudioDuration(null);

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '文件验证失败');
      return;
    }

    setSelectedFile(file);
    setIsAnalyzing(true);

    try {
      const duration = await getAudioDuration(file);
      setAudioDuration(duration);
    } catch {
      setAudioDuration(0);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || audioDuration === null) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setIsLoading(true);

    uploadControllerRef.current = new AbortController();

    try {
      const audioFile = await uploadAudio(
        selectedFile,
        audioDuration,
        (progress) => setUploadProgress(progress)
      );

      setCurrentAudio(audioFile);
      setUploadProgress(100);

      const annotations = await getAnnotations(audioFile.id);
      setAnnotations(annotations);

      setTimeout(() => {
        setActivePanel('annotations');
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败';
      setUploadError(message);
      setError(message);
    } finally {
      setIsUploading(false);
      setIsLoading(false);
      uploadControllerRef.current = null;
    }
  }, [selectedFile, audioDuration, setCurrentAudio, setUploadProgress, setActivePanel, setError, setAnnotations, setIsLoading]);

  const handleCancel = useCallback(() => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
      uploadControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setSelectedFile(null);
    setAudioDuration(null);
    setUploadError(null);
  }, [setUploadProgress]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setAudioDuration(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (currentAudio) {
    return (
      <div className="p-6 rounded-xl bg-[#0f3460]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#e94560]/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#2ecc71]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#eeeeee] truncate">{currentAudio.name}</h3>
            <p className="text-sm text-gray-400">
              {formatTime(currentAudio.duration)} · {formatFileSize(currentAudio.size)} · {currentAudio.format.toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentAudio(null);
              setAnnotations([]);
            }}
            className="p-2 rounded-lg bg-[#1a1a2e] text-gray-400 hover:text-[#e94560] hover:bg-[#e94560]/10 transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onClick={!isUploading ? handleClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300
          ${isDragging ? 'border-[#e94560] bg-[#e94560]/10' : 'border-gray-600 bg-[#0f3460] hover:border-[#e94560]/50'}
          ${isUploading ? 'cursor-default' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300
            ${isDragging ? 'bg-[#e94560] scale-110' : 'bg-[#e94560]/20'}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-[#e94560]'}`} />
          </div>

          {!selectedFile ? (
            <>
              <h3 className="text-lg font-semibold text-[#eeeeee] mb-2">
                拖拽音频文件到这里
              </h3>
              <p className="text-sm text-gray-400 mb-1">
                或点击选择文件
              </p>
              <p className="text-xs text-gray-500">
                支持 MP3、WAV 格式，最大 20MB
              </p>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-center gap-3 mb-3">
                <FileAudio className="w-6 h-6 text-[#e94560]" />
                <span className="font-medium text-[#eeeeee] truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {formatFileSize(selectedFile.size)}
                {isAnalyzing ? ' · 分析中...' : audioDuration !== null ? ` · ${formatTime(audioDuration)}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{uploadError}</p>
        </div>
      )}

      {selectedFile && !isUploading && !uploadError && (
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-3 px-4 rounded-lg bg-[#0f3460] text-[#eeeeee] font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#0f3460]/30"
          >
            重新选择
          </button>
          <button
            onClick={handleUpload}
            disabled={isAnalyzing}
            className="flex-1 py-3 px-4 rounded-lg bg-[#e94560] text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#e94560]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            开始上传
          </button>
        </div>
      )}

      {isUploading && (
        <div className="p-4 rounded-xl bg-[#0f3460]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">上传进度</span>
            <span className="text-sm font-medium text-[#e94560]">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-[#1a1a2e] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#e94560] to-[#ff6b8a] transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <button
            onClick={handleCancel}
            className="w-full py-2 px-4 rounded-lg bg-[#1a1a2e] text-gray-400 text-sm font-medium transition-all duration-200 hover:text-[#e94560] hover:bg-[#e94560]/10"
          >
            取消上传
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
