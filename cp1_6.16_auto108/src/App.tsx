import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  analyzeImage,
  applyCorrection,
  excludeElement,
  type AnalysisResult,
  type ElementData,
} from './analyzer';
import {
  renderAnalysis,
  getElementAtPosition,
  type RenderOptions,
} from './visualizer';
import Report from './report';

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('等待上传图片...');
  const [isDragging, setIsDragging] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGroupColors, setShowGroupColors] = useState(true);
  const [analyzeTime, setAnalyzeTime] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<{ x: number; y: number; delta: number } | null>(null);

  const loadImageFromFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusText('❌ 请上传图片文件（PNG/JPG）');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusText('❌ 文件大小不能超过10MB');
      return;
    }

    const reader = new FileReader();
    setStatusText('📂 正在加载图片...');
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setResult(null);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setSelectedElement(null);
        setHoveredElement(null);
        setStatusText(`✅ 图片已加载（${img.width}×${img.height}），点击"开始分析"`);
      };
      img.onerror = () => {
        setStatusText('❌ 图片加载失败');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setStatusText('❌ 文件读取失败');
    };
    reader.readAsDataURL(file);
  }, []);

  const loadImageFromUrl = useCallback(async (url: string) => {
    if (!url.trim()) return;
    setStatusText('🌐 正在从URL加载图片...');

    const proxyUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setResult(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setSelectedElement(null);
      setHoveredElement(null);
      setStatusText(`✅ 图片已加载（${img.width}×${img.height}），点击"开始分析"`);
    };
    img.onerror = () => {
      setStatusText('⚠️ URL加载失败（可能是跨域限制），请尝试直接上传图片');
    };
    img.src = proxyUrl;
  }, []);

  const runAnalysis = useCallback(() => {
    if (!image) return;
    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);
    const startTime = performance.now();
    setStatusText('🔍 正在初始化分析...');

    requestAnimationFrame(() => {
      try {
        const maxDim = 2048;
        let w = image.width;
        let h = image.height;
        const scale = w > maxDim || h > maxDim ? Math.min(maxDim / w, maxDim / h) : 1;
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;
        const offCtx = offscreenCanvas.getContext('2d')!;
        offCtx.imageSmoothingEnabled = true;
        offCtx.drawImage(image, 0, 0, w, h);
        const imageData = offCtx.getImageData(0, 0, w, h);

        setTimeout(() => {
          try {
            const analysisResult = analyzeImage(imageData, (p, s) => {
              setProgress(Math.round(p * 100));
              setStatusText(s);
            });

            if (scale !== 1) {
              const scaleBack = 1 / scale;
              analysisResult.elements = analysisResult.elements.map((e) => ({
                ...e,
                bbox: {
                  x: e.bbox.x * scaleBack,
                  y: e.bbox.y * scaleBack,
                  width: e.bbox.width * scaleBack,
                  height: e.bbox.height * scaleBack,
                },
                centerX: e.centerX * scaleBack,
                centerY: e.centerY * scaleBack,
                area: e.area * scaleBack * scaleBack,
              }));
              analysisResult.imageWidth = image.width;
              analysisResult.imageHeight = image.height;
              analysisResult.pairs = analysisResult.pairs.map((p) => ({
                ...p,
                horizontalDeviation: p.horizontalDeviation * scaleBack,
                verticalDeviation: p.verticalDeviation * scaleBack,
                spacingH: p.spacingH * scaleBack,
                spacingV: p.spacingV * scaleBack,
              }));
              analysisResult.groups = analysisResult.groups.map((g) => ({
                ...g,
                avgHorizontalDeviation: g.avgHorizontalDeviation * scaleBack,
                avgVerticalDeviation: g.avgVerticalDeviation * scaleBack,
                spacingVariance: g.spacingVariance * scaleBack * scaleBack,
              }));
              analysisResult.horizontalDeviations = analysisResult.horizontalDeviations.map(
                (d) => d * scaleBack
              );
              analysisResult.verticalDeviations = analysisResult.verticalDeviations.map(
                (d) => d * scaleBack
              );
              analysisResult.spacingDeviations = analysisResult.spacingDeviations.map(
                (d) => d * scaleBack
              );
            }

            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            setAnalyzeTime(parseFloat(elapsed));
            setResult(analysisResult);
            setProgress(100);
            setIsAnalyzing(false);
            setStatusText(
              `🎉 分析完成！检测到 ${analysisResult.totalElements} 个元素，耗时 ${elapsed}秒`
            );
          } catch (err) {
            console.error(err);
            setIsAnalyzing(false);
            setStatusText('❌ 分析过程发生错误：' + (err as Error).message);
          }
        }, 50);
      } catch (err) {
        console.error(err);
        setIsAnalyzing(false);
        setStatusText('❌ 无法处理图片：' + (err as Error).message);
      }
    });
  }, [image]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const options: RenderOptions = {
      zoom,
      offsetX,
      offsetY,
      hoveredElementId: hoveredElement,
      selectedElementId: selectedElement,
      showGuides,
      showLabels,
      showGroupColors,
    };

    renderAnalysis(ctx, image, result, width, height, options);
  }, [
    image,
    result,
    zoom,
    offsetX,
    offsetY,
    hoveredElement,
    selectedElement,
    showGuides,
    showLabels,
    showGroupColors,
  ]);

  useEffect(() => {
    const loop = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadImageFromFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      loadImageFromFile(files[0]);
    }
    e.target.value = '';
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      pendingZoomRef.current = { x: mouseX, y: mouseY, delta };
    },
    [image]
  );

  useEffect(() => {
    if (!pendingZoomRef.current) return;
    const { x, y, delta } = pendingZoomRef.current;
    pendingZoomRef.current = null;

    const container = containerRef.current;
    if (!container) return;

    const oldZoom = zoom;
    let newZoom = oldZoom * (1 + delta);
    newZoom = Math.max(0.5, Math.min(2, newZoom));
    if (Math.abs(newZoom - oldZoom) < 0.001) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const imgRatio = image!.width / image!.height;
    const containerRatio = w / h;
    let displayW: number;
    let displayH: number;
    if (imgRatio > containerRatio) {
      displayW = w * 0.96;
      displayH = displayW / imgRatio;
    } else {
      displayH = h * 0.92;
      displayW = displayH * imgRatio;
    }
    const baseScale = displayW / image!.width;

    const centerX = w / 2;
    const centerY = h / 2;

    const drawX = centerX - (displayW * oldZoom) / 2 + offsetX;
    const drawY = centerY - (displayH * oldZoom) / 2 + offsetY;

    const imgRelX = (x - drawX) / (displayW * oldZoom);
    const imgRelY = (y - drawY) / (displayH * oldZoom);

    const newDrawX = x - imgRelX * displayW * newZoom;
    const newDrawY = y - imgRelY * displayH * newZoom;

    const newOffsetX = newDrawX - (centerX - (displayW * newZoom) / 2);
    const newOffsetY = newDrawY - (centerY - (displayH * newZoom) / 2);

    setZoom(newZoom);
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  }, [zoom, offsetX, offsetY, image]);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offsetX,
        oy: offsetY,
      };
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const options: RenderOptions = {
      zoom,
      offsetX,
      offsetY,
      hoveredElementId: hoveredElement,
      selectedElementId: selectedElement,
      showGuides,
      showLabels,
      showGroupColors,
    };

    const hit = getElementAtPosition(
      mouseX,
      mouseY,
      image,
      result,
      width,
      height,
      options
    );

    if (hit) {
      setSelectedElement((prev) => (prev === hit.id ? null : hit.id));
    } else {
      setSelectedElement(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setOffsetX(panStartRef.current.ox + (e.clientX - panStartRef.current.x));
        setOffsetY(panStartRef.current.oy + (e.clientY - panStartRef.current.y));
        return;
      }
      if (!image) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      const options: RenderOptions = {
        zoom,
        offsetX,
        offsetY,
        hoveredElementId: hoveredElement,
        selectedElementId: selectedElement,
        showGuides,
        showLabels,
        showGroupColors,
      };

      const hit = getElementAtPosition(
        mouseX,
        mouseY,
        image,
        result,
        width,
        height,
        options
      );
      setHoveredElement(hit ? hit.id : null);
    },
    [
      image,
      result,
      zoom,
      offsetX,
      offsetY,
      hoveredElement,
      selectedElement,
      showGuides,
      showLabels,
      showGroupColors,
      isPanning,
    ]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleApplyCorrection = (groupId: string) => {
    if (!result) return;
    setResult(applyCorrection(result, groupId));
    setStatusText('✅ 已应用分组修正');
  };

  const handleExcludeElement = (elementId: string) => {
    if (!result) return;
    setResult(excludeElement(result, elementId));
    setSelectedElement(null);
    setHoveredElement(null);
    setStatusText('✅ 已排除该元素，分数已重新计算');
  };

  const selectedElementData: ElementData | null = React.useMemo(() => {
    if (!result || !selectedElement) return null;
    return result.elements.find((e) => e.id === selectedElement) || null;
  }, [result, selectedElement]);

  const zoomIn = () => setZoom((z) => Math.min(2, z * 1.2));
  const zoomOut = () => setZoom((z) => Math.max(0.5, z / 1.2));
  const resetView = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      loadImageFromUrl(urlInput.trim());
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setProgress(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setSelectedElement(null);
    setHoveredElement(null);
    setStatusText('等待上传图片...');
    setAnalyzeTime(null);
  };

  return (
    <div className="app-container">
      <div className={`left-panel ${leftCollapsed ? 'collapsed' : ''}`}>
        {!leftCollapsed ? (
          <>
            <div className="panel-header">
              <div>
                <span className="panel-title">🎨 布局诊断画布</span>
                {analyzeTime !== null && (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 12,
                      color: '#757575',
                      background: '#F5F5F5',
                      padding: '3px 8px',
                      borderRadius: 8,
                    }}
                  >
                    耗时 {analyzeTime}s
                  </span>
                )}
              </div>
              <button
                className={`collapse-btn ${leftCollapsed ? 'rotated' : ''}`}
                onClick={() => setLeftCollapsed(true)}
                title="折叠左侧面板"
              >
                ◀
              </button>
            </div>
            <div className="panel-content">
              {!image && (
                <>
                  <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="upload-icon">📤</div>
                    <div className="upload-text">
                      拖拽图片到此处，或 <strong>点击选择文件</strong>
                    </div>
                    <div className="upload-hint">
                      支持 PNG / JPG，最大 10MB，推荐分辨率 1920×1080 以下
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileSelect}
                      className="input-hidden"
                    />
                  </div>

                  <div className="url-input-container">
                    <input
                      type="text"
                      className="url-input"
                      placeholder="或输入图片URL地址..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUrlSubmit();
                      }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                    >
                      🌐 加载URL
                    </button>
                  </div>
                </>
              )}

              {image && !result && !isAnalyzing && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={runAnalysis}>
                    🔍 开始分析
                  </button>
                  <button className="btn btn-secondary" onClick={handleReset}>
                    ↺ 重新选择
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div
                  style={{
                    padding: 16,
                    background: '#E3F2FD',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#1565C0',
                  }}
                >
                  🔄 正在分析中，请稍候...（{progress}%）
                </div>
              )}

              {result && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <button className="btn btn-secondary" onClick={handleReset}>
                    ↺ 重新选择
                  </button>
                  <button className="btn btn-secondary" onClick={runAnalysis}>
                    🔄 重新分析
                  </button>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#616161',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showGuides}
                      onChange={(e) => setShowGuides(e.target.checked)}
                    />
                    参考线
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#616161',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                    />
                    标注文字
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#616161',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showGroupColors}
                      onChange={(e) => setShowGroupColors(e.target.checked)}
                    />
                    分组底色
                  </label>
                </div>
              )}

              <div
                className="canvas-container"
                ref={containerRef}
                style={{ cursor: isPanning ? 'grabbing' : image ? 'crosshair' : 'default' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  handleMouseUp();
                  setHoveredElement(null);
                }}
              >
                <canvas ref={canvasRef} />
                {!image && (
                  <div className="canvas-empty">
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🖼️</div>
                    <div>上传或加载图片后，画布将显示在此区域</div>
                  </div>
                )}
                {image && (
                  <div className="zoom-controls">
                    <button className="zoom-btn" onClick={zoomOut} title="缩小">
                      −
                    </button>
                    <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                    <button className="zoom-btn" onClick={zoomIn} title="放大">
                      +
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={resetView}
                      title="重置视图"
                      style={{ fontSize: 12 }}
                    >
                      ⟳
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="collapsed-content">
            <button
              className="collapse-btn rotated"
              onClick={() => setLeftCollapsed(false)}
              title="展开左侧面板"
              style={{ alignSelf: 'flex-end', margin: 12 }}
            >
              ◀
            </button>
            <div className="collapsed-icon" title="布局诊断">🎨</div>
            {image && (
              <>
                <div className="collapsed-icon" title="画布">🖼️</div>
                {result && <div className="collapsed-icon" title="已分析">✅</div>}
              </>
            )}
          </div>
        )}

        <div className="status-bar">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: isAnalyzing ? `${progress}%` : result ? '100%' : '0%',
              }}
            />
          </div>
          <span className="status-text">{statusText}</span>
        </div>
      </div>

      <div className="right-panel">
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <div className="panel-header" style={{ padding: '14px 18px' }}>
            <span className="panel-title">📊 分析报告与控制面板</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
          <Report
            result={result}
            selectedElement={selectedElementData}
            onApplyCorrection={handleApplyCorrection}
            onExcludeElement={handleExcludeElement}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
