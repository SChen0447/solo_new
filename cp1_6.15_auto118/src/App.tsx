import { useState, useCallback, useRef } from 'react';
import { Upload, Music, AlertCircle } from 'lucide-react';
import { SceneManager } from './sceneManager';
import { MixerPanel } from './mixerPanel';
import { audioEngine } from './audioEngine';
import { useAudioStore } from './store';

export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isPlaying, fileName } = useAudioStore();

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const audioBuffer = await audioEngine.loadAudioFile(file);
      audioEngine.createAudioGraph(audioBuffer);
      useAudioStore.getState().setFileName(file.name);
      audioEngine.play();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '音频加载失败';
      setError(errorMessage);
      console.error('音频加载失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: '#0a0a1a' }}>
      <div className="absolute inset-0 md:pr-[280px]">
        <SceneManager />
      </div>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center md:pr-[280px] pointer-events-none">
          <div
            className={`pointer-events-auto relative transition-all duration-300 ease-in-out ${
              isDragging ? 'scale-105' : 'scale-100'
            }`}
            style={{
              width: '320px',
              height: '200px',
              backgroundColor: '#1a1a2e',
              border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? '#00d4aa' : '#4a4a6a'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: isDragging
                ? '0 0 20px rgba(0, 212, 170, 0.3), inset 0 0 30px rgba(0, 212, 170, 0.1)'
                : '0 4px 20px rgba(0, 0, 0, 0.3)',
              background: isDragging
                ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(26, 26, 46, 0.9) 100%)'
                : 'linear-gradient(135deg, rgba(74, 74, 122, 0.1) 0%, rgba(26, 26, 46, 0.9) 100%)',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
              className="hidden"
              onChange={handleInputChange}
            />

            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
              {isLoading ? (
                <>
                  <div className="w-12 h-12 border-4 border-t-0 border-r-0 border-[#00d4aa] rounded-full animate-spin" />
                  <p className="text-sm text-gray-300">正在解码音频...</p>
                </>
              ) : (
                <>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isDragging ? 'rgba(0, 212, 170, 0.2)' : 'rgba(74, 74, 122, 0.3)',
                    }}
                  >
                    {isDragging ? (
                      <Music size={32} style={{ color: '#00d4aa' }} />
                    ) : (
                      <Upload size={32} style={{ color: '#00d4aa' }} />
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-white font-medium mb-1">
                      {isDragging ? '释放以上传音频' : '拖拽音频文件到此处'}
                    </p>
                    <p className="text-xs" style={{ color: '#a0a0c0' }}>
                      或点击选择文件 · MP3 / WAV · 最大20MB
                    </p>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div
                className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isPlaying && !fileName && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-1/2 md:-translate-x-1/2 z-20">
          <div
            className="px-4 py-2 rounded-full text-sm"
            style={{
              backgroundColor: 'rgba(22, 22, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#00d4aa',
            }}
          >
            正在播放: {fileName}
          </div>
        </div>
      )}

      <MixerPanel />

      <div className="absolute top-4 left-4 z-20">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#00d4aa' }}
          >
            <Music size={20} className="text-[#0a0a1a]" />
          </div>
          Sonic Visualizer
        </h1>
      </div>
    </div>
  );
}
