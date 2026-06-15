import { useCallback, useRef, useState } from 'react';
import { useColorStore } from './store';
import { extractColors } from './colorExtractor';
import ColorPalette from './ColorPalette';
import ThemePreview from './ThemePreview';
import Toast from './Toast';

export default function App() {
  const {
    isExtracting,
    thumbnailUrl,
    mode,
    theme,
    setIsExtracting,
    setProgress,
    setExtractedColors,
    setThumbnailUrl,
    setMode,
  } = useColorStore();

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 PNG、JPG、WEBP 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setThumbnailUrl(url);

    setIsExtracting(true);
    setProgress(0);

    const startTime = Date.now();
    const duration = 2000;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 95);
      setProgress(p);
    }, 50);

    try {
      const colors = await extractColors(file);
      clearInterval(progressInterval);

      const remaining = duration - (Date.now() - startTime);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      setProgress(100);

      setTimeout(() => {
        setExtractedColors(colors);
        setIsExtracting(false);
        setProgress(0);
      }, 200);
    } catch {
      clearInterval(progressInterval);
      setIsExtracting(false);
      setProgress(0);
      alert('颜色提取失败，请尝试其他图片');
    }
  }, [setIsExtracting, setProgress, setExtractedColors, setThumbnailUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const modeButtonStyle = (isActive: boolean) => ({
    borderColor: isActive ? theme.accent1 : '#DDDDDD',
    backgroundColor: isActive ? theme.accent1 : 'white',
  });

  const dotStyle = (isActive: boolean) => ({
    width: isActive ? '14px' : '0px',
    height: isActive ? '14px' : '0px',
    transform: isActive ? 'scale(1)' : 'scale(0)',
  });

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F5]">
      <header className="h-14 flex items-center justify-center bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <h1 className="text-base font-semibold text-gray-700 tracking-wide">
          智能配色主题生成器
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto p-5">
          <div
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[160px] ${
              dragOver
                ? 'border-solid border-[#2196F3] bg-blue-50'
                : 'border-[#AAAAAA] hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {thumbnailUrl && !isExtracting ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={thumbnailUrl}
                  alt="缩略图"
                  className="max-w-full max-h-[140px] rounded-lg object-contain"
                />
                <span className="text-xs text-gray-400">点击更换图片</span>
              </div>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm text-gray-400 mt-2">拖拽或点击上传图片</span>
                <span className="text-[10px] text-gray-300 mt-1">支持 PNG / JPG / WEBP，最大 5MB</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          <div className="mt-5">
            <ColorPalette />
          </div>
        </aside>

        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setMode('light')}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={modeButtonStyle(mode === 'light')}
            >
              <div
                className="rounded-full bg-white transition-transform duration-200"
                style={dotStyle(mode === 'light')}
              />
            </button>
            <span className="text-xs text-gray-400">亮色</span>

            <button
              onClick={() => setMode('dark')}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={modeButtonStyle(mode === 'dark')}
            >
              <div
                className="rounded-full bg-white transition-transform duration-200"
                style={dotStyle(mode === 'dark')}
              />
            </button>
            <span className="text-xs text-gray-400">暗色</span>
          </div>

          <ThemePreview />
        </main>
      </div>

      <Toast />
    </div>
  );
}
