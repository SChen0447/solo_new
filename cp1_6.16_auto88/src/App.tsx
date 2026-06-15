import { useState, useRef, useEffect, useCallback } from 'react';
import TimelineEditor from './components/TimelineEditor';
import SubtitleList from './components/SubtitleList';
import {
  SubtitleItem,
  ExportFormat,
  exportToSRT,
  exportToASS,
  createSubtitleId,
  translateText,
  detectLanguageDirection
} from './utils/subtitleParser';

export default function App() {
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('video');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([
    { id: createSubtitleId(), startTime: 0, endTime: 3, text: '欢迎使用字幕编辑器' },
    { id: createSubtitleId(), startTime: 3.5, endTime: 7, text: '在这里添加和编辑您的字幕' },
    { id: createSubtitleId(), startTime: 8, endTime: 12, text: '支持拖拽调整时间和批量操作' }
  ]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isListFullscreen, setIsListFullscreen] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setVideoName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUrlSubmit = () => {
    if (videoUrl.trim()) {
      setVideoSource(videoUrl.trim());
      setVideoName('online_video');
      setShowUrlInput(false);
    }
  };

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 60);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, videoDuration || time));
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [videoDuration]);

  const updateSubtitle = useCallback((id: string, updates: Partial<SubtitleItem>) => {
    setSubtitles(prev => prev.map(sub =>
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  }, []);

  const addSubtitle = useCallback((startTime?: number, endTime?: number) => {
    const start = startTime ?? currentTime;
    const end = endTime ?? (start + 2);
    const newSub: SubtitleItem = {
      id: createSubtitleId(),
      startTime: start,
      endTime: Math.max(end, start + 0.5),
      text: ''
    };
    setSubtitles(prev => [...prev, newSub].sort((a, b) => a.startTime - b.startTime));
    setSelectedSubtitleId(newSub.id);
  }, [currentTime]);

  const deleteSubtitle = useCallback((id: string) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedSubtitleId === id) {
      setSelectedSubtitleId(null);
    }
  }, [selectedSubtitleId]);

  const splitSubtitle = useCallback((id: string, splitTime: number) => {
    setSubtitles(prev => {
      const sub = prev.find(s => s.id === id);
      if (!sub) return prev;
      const firstPart: SubtitleItem = {
        ...sub,
        endTime: splitTime
      };
      const secondPart: SubtitleItem = {
        ...sub,
        id: createSubtitleId(),
        startTime: splitTime,
        text: sub.text.slice(Math.floor(sub.text.length / 2))
      };
      firstPart.text = firstPart.text.slice(0, Math.floor(firstPart.text.length / 2));
      const updated = prev.filter(s => s.id !== id);
      return [...updated, firstPart, secondPart].sort((a, b) => a.startTime - b.startTime);
    });
  }, []);

  const handleBatchShift = useCallback((ms: number) => {
    if (selectedIds.size === 0) return;
    const shift = ms / 1000;
    setSubtitles(prev => prev.map(sub => {
      if (selectedIds.has(sub.id)) {
        return {
          ...sub,
          startTime: Math.max(0, sub.startTime + shift),
          endTime: Math.max(0.5, sub.endTime + shift)
        };
      }
      return sub;
    }));
  }, [selectedIds]);

  const handleSelectSubtitle = useCallback((id: string) => {
    setSelectedSubtitleId(id);
    const sub = subtitles.find(s => s.id === id);
    if (sub) {
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 300);
    }
  }, [subtitles]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === subtitles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subtitles.map(s => s.id)));
    }
  }, [selectedIds.size, subtitles]);

  const handleTranslate = useCallback(async (id: string) => {
    const sub = subtitles.find(s => s.id === id);
    if (!sub || !sub.text.trim()) return;
    const direction = detectLanguageDirection(sub.text);
    updateSubtitle(id, { isTranslated: false });
    const translation = await translateText(sub.text, direction);
    updateSubtitle(id, { translation, isTranslated: true });
  }, [subtitles, updateSubtitle]);

  const handleReplaceWithTranslation = useCallback((id: string) => {
    const sub = subtitles.find(s => s.id === id);
    if (!sub || !sub.translation) return;
    updateSubtitle(id, { text: sub.translation, translation: undefined, isTranslated: false });
  }, [subtitles, updateSubtitle]);

  const handleExport = useCallback((format: ExportFormat) => {
    setIsExporting(true);
    setShowExportDropdown(false);
    setExportProgress(0);

    const startTime = Date.now();
    const duration = 500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setExportProgress(progress);

      if (progress < 100) {
        requestAnimationFrame(animate);
      } else {
        const content = format === 'SRT'
          ? exportToSRT(subtitles)
          : exportToASS(subtitles);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `${videoName}_${timestamp}.${format.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  }, [subtitles, videoName]);

  const isMobile = windowWidth < 900;
  const showRightPanel = !isMobile || isListFullscreen;

  return (
    <div style={styles.app}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={{ position: 'relative' }}>
            <button
              style={styles.toolbarButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>上传视频</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          <button
            style={styles.toolbarButton}
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>URL导入</span>
          </button>

          {showUrlInput && (
            <div style={styles.urlInputWrapper}>
              <input
                type="text"
                placeholder="输入视频URL (支持iframe嵌入)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                style={styles.urlInput}
              />
              <button style={styles.primaryButton} onClick={handleUrlSubmit}>
                确认
              </button>
            </div>
          )}
        </div>

        <div style={styles.zoomControl}>
          <span style={styles.zoomLabel}>缩放:</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            style={styles.zoomSlider}
          />
          <span style={styles.zoomValue}>{zoomLevel.toFixed(1)}x</span>
        </div>

        <div style={styles.toolbarRight}>
          <button
            style={styles.toolbarButton}
            onClick={() => addSubtitle()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>添加字幕</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.primaryButton}
              onClick={() => !isExporting && setShowExportDropdown(!showExportDropdown)}
              disabled={isExporting}
            >
              {isExporting ? (
                <div style={styles.progressBarContainer}>
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${exportProgress}%`
                    }}
                  />
                  <span style={styles.progressText}>导出中 {Math.round(exportProgress)}%</span>
                </div>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>导出</span>
                </>
              )}
            </button>
            {showExportDropdown && (
              <div style={styles.exportDropdown}>
                <button style={styles.dropdownItem} onClick={() => handleExport('SRT')}>
                  导出为 SRT 格式
                </button>
                <button style={styles.dropdownItem} onClick={() => handleExport('ASS')}>
                  导出为 ASS 格式
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...styles.mainContainer, ...(isMobile && !isListFullscreen ? styles.mainContainerMobile : {}) }}>
        <div style={{ ...styles.leftSection, ...(isMobile && isListFullscreen ? styles.hidden : {}) }}>
          <div style={styles.videoContainer}>
            {videoSource ? (
              <video
                ref={videoRef}
                src={videoSource}
                style={styles.video}
                controls
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div style={styles.videoPlaceholder}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <p style={styles.placeholderText}>请上传视频文件或输入URL</p>
                <p style={styles.placeholderSubtext}>支持 MP4 / WebM 格式</p>
              </div>
            )}
          </div>

          <div style={styles.divider} />

          <TimelineEditor
            videoDuration={videoDuration || 60}
            currentTime={currentTime}
            subtitles={subtitles}
            selectedSubtitleId={selectedSubtitleId}
            highlightId={highlightId}
            zoomLevel={zoomLevel}
            onSeek={seekTo}
            onPlayPause={handlePlayPause}
            isPlaying={isPlaying}
            onUpdateSubtitle={updateSubtitle}
            onSelectSubtitle={setSelectedSubtitleId}
            onSplitSubtitle={splitSubtitle}
            onAddSubtitle={addSubtitle}
          />
        </div>

        {showRightPanel && (
          <div style={{
            ...styles.rightSection,
            ...(isMobile ? styles.rightSectionMobile : {}),
            ...(isMobile && isListFullscreen ? styles.rightSectionFullscreen : {})
          }}>
            {isMobile && (
              <div style={styles.mobileHeader}>
                <h3 style={styles.panelTitle}>字幕列表</h3>
                <button style={styles.closeButton} onClick={() => setIsListFullscreen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}
            <SubtitleList
              subtitles={subtitles}
              selectedSubtitleId={selectedSubtitleId}
              selectedIds={selectedIds}
              onSelectSubtitle={handleSelectSubtitle}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onUpdateSubtitle={updateSubtitle}
              onDeleteSubtitle={deleteSubtitle}
              onBatchShift={handleBatchShift}
              onTranslate={handleTranslate}
              onReplaceWithTranslation={handleReplaceWithTranslation}
            />
          </div>
        )}
      </div>

      {isMobile && !isListFullscreen && (
        <div style={styles.mobileBottomBar}>
          <button style={styles.expandButton} onClick={() => setIsListFullscreen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>字幕列表 ({subtitles.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1E1E1E',
    overflow: 'hidden'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#2D2D2D',
    borderBottom: '1px solid #3D3D3D',
    gap: '16px',
    flexWrap: 'wrap'
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#3D3D3D',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#1E90FF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease, transform 0.1s ease'
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 16px'
  },
  zoomLabel: {
    color: '#999',
    fontSize: '13px'
  },
  zoomSlider: {
    width: '160px',
    height: '4px',
    cursor: 'pointer',
    accentColor: '#1E90FF'
  },
  zoomValue: {
    color: '#E0E0E0',
    fontSize: '13px',
    fontWeight: 500,
    minWidth: '40px',
    textAlign: 'right'
  },
  urlInputWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  urlInput: {
    padding: '8px 12px',
    backgroundColor: '#1E1E1E',
    border: '1px solid #4D4D4D',
    borderRadius: '6px',
    color: '#E0E0E0',
    fontSize: '13px',
    width: '280px',
    outline: 'none'
  },
  progressBarContainer: {
    position: 'relative',
    width: '100px',
    height: '20px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
    transition: 'width 0.05s linear'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    zIndex: 1
  },
  exportDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#2D2D2D',
    border: '1px solid #4D4D4D',
    borderRadius: '8px',
    padding: '4px',
    minWidth: '180px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 1000
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    transition: 'background-color 0.15s ease'
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  mainContainerMobile: {
    paddingBottom: '56px'
  },
  leftSection: {
    width: '70%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid #3D3D3D'
  },
  hidden: {
    display: 'none'
  },
  videoContainer: {
    width: '100%',
    flex: 1,
    minHeight: '300px',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000'
  },
  videoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: '#666'
  },
  placeholderText: {
    fontSize: '16px',
    color: '#888'
  },
  placeholderSubtext: {
    fontSize: '13px',
    color: '#666'
  },
  divider: {
    height: '1px',
    backgroundColor: '#4D4D4D'
  },
  rightSection: {
    width: '30%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#252526'
  },
  rightSectionMobile: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '56px',
    borderTop: '1px solid #3D3D3D',
    zIndex: 100
  },
  rightSectionFullscreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1000
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #3D3D3D',
    backgroundColor: '#2D2D2D'
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#E0E0E0'
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#3D3D3D',
    border: 'none',
    borderRadius: '6px',
    color: '#E0E0E0',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  mobileBottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#2D2D2D',
    borderTop: '1px solid #3D3D3D',
    padding: '8px 16px',
    zIndex: 100
  },
  expandButton: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#3D3D3D',
    border: 'none',
    borderRadius: '8px',
    color: '#E0E0E0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }
};
