import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from './store';
import { loadImage, cannyEdgeDetection, edgesToImageData } from './modules/imageProcessing';
import { renderStyle, animateStyleTransition, StyleType } from './modules/styleRenderer';
import { DrawingTool, BrushSettings } from './modules/drawingTool';
import { LayerManager } from './modules/layerManager';
import {
  UploadArea,
  ThresholdSlider,
  StyleSelector,
  BrushControls,
  LayerPanel,
  ExportButton,
  SectionTitle
} from './modules/uiComponents';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 500;
const PREVIEW_SIZE = 280;

const App: React.FC = () => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const drawingToolRef = useRef<DrawingTool | null>(null);
  const prevStyleImageDataRef = useRef<ImageData | null>(null);
  const lastStyleRef = useRef<StyleType>('hiphop');
  const [showHistoryPreview, setShowHistoryPreview] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isExporting, setIsExporting] = useState(false);

  const store = useAppStore();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    layerManagerRef.current = new LayerManager(CANVAS_WIDTH, CANVAS_HEIGHT);
    drawingToolRef.current = new DrawingTool(CANVAS_WIDTH, CANVAS_HEIGHT);
    const drawingCtx = layerManagerRef.current.getLayerContext('drawing');
    if (drawingCtx) {
      drawingToolRef.current.setContext(drawingCtx);
    }
  }, []);

  const renderComposite = useCallback(() => {
    const canvas = mainCanvasRef.current;
    const lm = layerManagerRef.current;
    if (!canvas || !lm) return;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    lm.mergeToContext(ctx, false);
  }, []);

  const processImage = useCallback((img: HTMLImageElement) => {
    const storeState = useAppStore.getState();
    const startTime = performance.now();

    const canvas = document.createElement('canvas');
    const maxW = CANVAS_WIDTH, maxH = CANVAS_HEIGHT;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const drawW = Math.floor(img.width * ratio);
    const drawH = Math.floor(img.height * ratio);
    const offsetX = Math.floor((maxW - drawW) / 2);
    const offsetY = Math.floor((maxH - drawH) / 2);

    canvas.width = drawW;
    canvas.height = drawH;
    const tempCtx = canvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0, drawW, drawH);
    const imageData = tempCtx.getImageData(0, 0, drawW, drawH);

    const edges = cannyEdgeDetection(imageData, storeState.lowThreshold, storeState.highThreshold);

    const fullEdges = {
      edgePixels: Array.from({ length: CANVAS_HEIGHT }, (_, y) =>
        Array.from({ length: CANVAS_WIDTH }, (_, x) => {
          const ex = x - offsetX;
          const ey = y - offsetY;
          if (ex >= 0 && ex < drawW && ey >= 0 && ey < drawH) {
            return edges.edgePixels[ey][ex];
          }
          return false;
        })
      ),
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    };

    useAppStore.getState().setEdges(fullEdges);

    const lm = layerManagerRef.current!;
    const edgeCtx = lm.getLayerContext('edge');
    if (edgeCtx) {
      const edgeImgData = edgesToImageData(fullEdges, '#00e5ff', 2);
      lm.clearLayer('edge');
      edgeCtx.putImageData(edgeImgData, 0, 0);
    }

    const styleCtx = lm.getLayerContext('style');
    if (styleCtx) {
      lm.clearLayer('style');
      renderStyle(styleCtx, fullEdges, {
        type: storeState.selectedStyle,
        seed: storeState.styleSeed
      });
      prevStyleImageDataRef.current = styleCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      lastStyleRef.current = storeState.selectedStyle;
    }

    if (previewCanvasRef.current) {
      const previewCtx = previewCanvasRef.current.getContext('2d')!;
      previewCtx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      const previewRatio = Math.min(PREVIEW_SIZE / drawW, PREVIEW_SIZE / drawH);
      const pw = drawW * previewRatio;
      const ph = drawH * previewRatio;
      const px = (PREVIEW_SIZE - pw) / 2;
      const py = (PREVIEW_SIZE - ph) / 2;
      previewCtx.drawImage(img, 0, 0, drawW, drawH, px, py, pw, ph);
    }

    renderComposite();
    console.log(`图像处理完成，耗时 ${(performance.now() - startTime).toFixed(1)}ms`);
  }, [renderComposite]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      useAppStore.getState().setErrorMessage(null);
      const img = await loadImage(file);
      useAppStore.getState().setOriginalImage(img);

      const lm = layerManagerRef.current;
      if (lm) {
        lm.clearLayer('edge');
        lm.clearLayer('style');
        lm.clearLayer('drawing');
        const drawingCtx = lm.getLayerContext('drawing');
        if (drawingCtx) {
          drawingToolRef.current = new DrawingTool(CANVAS_WIDTH, CANVAS_HEIGHT);
          drawingToolRef.current.setContext(drawingCtx);
        }
      }

      processImage(img);
    } catch (e: any) {
      useAppStore.getState().setErrorMessage(e.message || '上传失败');
    }
  }, [processImage]);

  useEffect(() => {
    const { edges, originalImage } = store;
    if (!edges || !originalImage) return;

    const timer = setTimeout(() => {
      processImage(originalImage);
    }, 150);

    return () => clearTimeout(timer);
  }, [store.lowThreshold, store.highThreshold]);

  useEffect(() => {
    const { edges, selectedStyle, styleSeed, isAnimating } = store;
    if (!edges || isAnimating) return;
    if (selectedStyle === lastStyleRef.current && prevStyleImageDataRef.current) return;

    const lm = layerManagerRef.current;
    if (!lm) return;

    const styleCtx = lm.getLayerContext('style');
    if (!styleCtx) return;

    useAppStore.getState().setIsAnimating(true);
    const oldData = prevStyleImageDataRef.current;

    animateStyleTransition(styleCtx, oldData, edges, selectedStyle, styleSeed)
      .then(() => {
        prevStyleImageDataRef.current = styleCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        lastStyleRef.current = selectedStyle;
        useAppStore.getState().setIsAnimating(false);
        renderComposite();
      });

    const animInterval = setInterval(() => renderComposite(), 30);
    setTimeout(() => clearInterval(animInterval), 550);
  }, [store.selectedStyle, store.styleSeed]);

  useEffect(() => {
    renderComposite();
  }, [store.layerState, renderComposite]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = mainCanvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!store.edges) return;
    const { x, y } = getCanvasCoords(e);
    const settings: BrushSettings = {
      size: store.brushSize,
      color: store.brushColor,
      shape: store.brushShape
    };
    drawingToolRef.current?.startDrawing(x, y, settings);
    renderComposite();
  }, [store.edges, store.brushSize, store.brushColor, store.brushShape, getCanvasCoords, renderComposite]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    drawingToolRef.current?.draw(x, y);
    renderComposite();
  }, [getCanvasCoords, renderComposite]);

  const handleCanvasMouseUp = useCallback(() => {
    drawingToolRef.current?.endDrawing();
    renderComposite();
  }, [renderComposite]);

  const handleUndo = useCallback(() => {
    const undone = drawingToolRef.current?.undo();
    if (undone) renderComposite();
  }, [renderComposite]);

  const handleExportPNG = useCallback(() => {
    const lm = layerManagerRef.current;
    if (!lm || !store.edges) return;

    const dataUrl = lm.exportPNG(2, true);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `graffiti_${store.selectedStyle}_${Date.now()}.png`;
    a.click();
  }, [store.edges, store.selectedStyle]);

  const handleExportGIF = useCallback(async () => {
    const lm = layerManagerRef.current;
    if (!lm || !store.edges) return;

    setIsExporting(true);
    try {
      const frames = await lm.exportGIF(1.5, 12, 3);

      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1a1a2e; padding: 20px; border-radius: 16px;
        border: 1px solid #3a3a5a; z-index: 9999;
        box-shadow: 0 0 40px rgba(0, 229, 255, 0.2);
        max-width: 80vw; max-height: 80vh; overflow: auto;
      `;

      const title = document.createElement('div');
      title.style.cssText = 'color: #e0e0ff; margin-bottom: 12px; font-size: 14px; font-weight: 600;';
      title.textContent = `🎬 GIF 帧预览 (共 ${frames.length} 帧) - 右键保存单帧`;

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;';

      frames.forEach((f, i) => {
        const img = document.createElement('img');
        img.src = f;
        img.style.cssText = 'width: 100%; border-radius: 4px; cursor: pointer;';
        img.title = `第 ${i + 1} 帧`;
        grid.appendChild(img);
      });

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '关闭';
      closeBtn.style.cssText = `
        margin-top: 16px; width: 100%; padding: 10px; border-radius: 8px;
        background: #00d4aa; color: white; border: none; cursor: pointer;
        font-weight: 600;
      `;
      closeBtn.onclick = () => document.body.removeChild(container);

      container.appendChild(title);
      container.appendChild(grid);
      container.appendChild(closeBtn);
      document.body.appendChild(container);
    } finally {
      setIsExporting(false);
    }
  }, [store.edges]);

  const handleSidebarToggle = useCallback(() => {
    useAppStore.getState().setSidebarCollapsed(!store.sidebarCollapsed);
  }, [store.sidebarCollapsed]);

  const isMobile = windowWidth < 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d20 100%)',
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
      color: '#e0e0ff'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 24px',
          background: 'rgba(30, 30, 50, 0.6)',
          borderRadius: '16px',
          border: '1px solid #3a3a5a',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ff3366, #00e5ff, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)'
            }}>
              🎨
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 700,
                background: 'linear-gradient(90deg, #00e5ff, #a855f7, #ff3366)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                涂鸦墙贴图生成器
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8080a0' }}>
                街道照片 → 风格化涂鸦墙贴 · 街头艺术创意图案原型工具
              </p>
            </div>
          </div>
          {isTablet && (
            <button
              onClick={handleSidebarToggle}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#2a2a4a',
                border: '1px solid #4a4a6a',
                color: '#e0e0ff',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.3s ease'
              }}
            >
              {store.sidebarCollapsed ? '☰ 展开面板' : '✕ 收起面板'}
            </button>
          )}
        </header>

        <div style={{
          display: isMobile ? 'block' : 'flex',
          gap: '20px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: isMobile ? '100%' : '320px',
            flexShrink: 0,
            display: isTablet && store.sidebarCollapsed ? 'none' : 'block'
          }}>
            <div style={{
              background: 'rgba(26, 26, 46, 0.9)',
              borderRadius: '16px',
              border: '1px solid #3a3a5a',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <SectionTitle icon="📷">照片上传</SectionTitle>
              <div style={{ position: 'relative' }}>
                <UploadArea
                  onFileUpload={handleFileUpload}
                  errorMessage={store.errorMessage}
                />
                {store.originalImage && (
                  <canvas
                    ref={previewCanvasRef}
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: 0,
                      borderRadius: '12px',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </div>

              {store.edges && (
                <>
                  <div style={{ marginTop: '8px' }}>
                    <SectionTitle icon="⚙️">边缘检测参数</SectionTitle>
                    <ThresholdSlider
                      label="低阈值"
                      value={store.lowThreshold}
                      min={20}
                      max={80}
                      step={5}
                      onChange={useAppStore.getState().setLowThreshold}
                    />
                    <ThresholdSlider
                      label="高阈值"
                      value={store.highThreshold}
                      min={60}
                      max={180}
                      step={5}
                      onChange={useAppStore.getState().setHighThreshold}
                    />
                  </div>

                  <StyleSelector
                    selected={store.selectedStyle}
                    onSelect={useAppStore.getState().setSelectedStyle}
                    onRegenerate={useAppStore.getState().regenerateStyle}
                    disabled={store.isAnimating}
                  />

                  <LayerPanel
                    layers={store.layerState.layers}
                    onVisibleChange={useAppStore.getState().updateLayerVisible}
                    onOpacityChange={useAppStore.getState().updateLayerOpacity}
                  />
                </>
              )}
            </div>
          </div>

          <div style={{
            flex: 1,
            minWidth: 0
          }}>
            <div style={{
              background: 'rgba(26, 26, 46, 0.9)',
              borderRadius: '16px',
              border: '1px solid #3a3a5a',
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <ExportButton
                  onExportPNG={handleExportPNG}
                  onExportGIF={handleExportGIF}
                  disabled={!store.edges}
                  isExporting={isExporting}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: '#8080a0'
                }}>
                  {store.edges ? (
                    <>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: 'rgba(0, 212, 170, 0.15)',
                        color: '#00d4aa',
                        border: '1px solid rgba(0, 212, 170, 0.3)'
                      }}>
                        ✓ 图像已加载
                      </span>
                      <span>
                        画布: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
                      </span>
                    </>
                  ) : (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'rgba(255, 159, 0, 0.15)',
                      color: '#ff9f00',
                      border: '1px solid rgba(255, 159, 0, 0.3)'
                    }}>
                      ⚡ 请上传照片开始创作
                    </span>
                  )}
                  {store.isAnimating && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)'
                    }}>
                      ✨ 风格过渡中...
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{ position: 'relative' }}>
                  <canvas
                    ref={mainCanvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    style={{
                      width: isMobile ? '100%' : `${CANVAS_WIDTH}px`,
                      maxWidth: '100%',
                      height: 'auto',
                      aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
                      background: '#1a1a2e',
                      borderRadius: '16px',
                      border: '1px solid #3a3a5a',
                      cursor: store.edges ? (
                        store.brushShape === 'line' ? 'crosshair' :
                        store.brushShape === 'arrow' ? 'copy' :
                        store.brushShape === 'star' ? 'cell' : 'text'
                      ) : 'default',
                      boxShadow: store.edges ? '0 8px 32px rgba(0, 0, 0, 0.4)' : 'none',
                      transition: 'box-shadow 0.3s ease'
                    }}
                  />
                  {!store.edges && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(26, 26, 46, 0.85)',
                      borderRadius: '16px',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        fontSize: '80px',
                        marginBottom: '20px',
                        opacity: 0.5,
                        animation: 'float 3s ease-in-out infinite'
                      }}>
                        🏙️
                      </div>
                      <div style={{
                        fontSize: '18px',
                        color: '#8080a0',
                        marginBottom: '8px'
                      }}>
                        上传街道照片，开启街头艺术创作
                      </div>
                      <div style={{ fontSize: '13px', color: '#5a5a7a' }}>
                        左侧拖拽或点击上传区开始
                      </div>
                    </div>
                  )}
                  <style>{`
                    @keyframes float {
                      0%, 100% { transform: translateY(0); }
                      50% { transform: translateY(-10px); }
                    }
                  `}</style>
                </div>

                <div style={{
                  width: '200px',
                  background: '#1e1e2e',
                  borderRadius: '12px',
                  border: '1px solid #3a3a5a',
                  flexShrink: 0,
                  display: isMobile ? 'none' : 'block'
                }}>
                  <BrushControls
                    brushSize={store.brushSize}
                    brushColor={store.brushColor}
                    brushShape={store.brushShape}
                    onSizeChange={useAppStore.getState().setBrushSize}
                    onColorChange={useAppStore.getState().setBrushColor}
                    onShapeChange={useAppStore.getState().setBrushShape}
                    onUndo={handleUndo}
                    canUndo={drawingToolRef.current?.canUndo() ?? false}
                    onHistoryPreview={setShowHistoryPreview}
                  />
                </div>
              </div>

              {isMobile && store.edges && (
                <div style={{
                  marginTop: '16px',
                  background: '#1e1e2e',
                  borderRadius: '12px',
                  border: '1px solid #3a3a5a'
                }}>
                  <BrushControls
                    brushSize={store.brushSize}
                    brushColor={store.brushColor}
                    brushShape={store.brushShape}
                    onSizeChange={useAppStore.getState().setBrushSize}
                    onColorChange={useAppStore.getState().setBrushColor}
                    onShapeChange={useAppStore.getState().setBrushShape}
                    onUndo={handleUndo}
                    canUndo={drawingToolRef.current?.canUndo() ?? false}
                    onHistoryPreview={setShowHistoryPreview}
                  />
                </div>
              )}
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(30, 30, 60, 0.5)',
              borderRadius: '12px',
              border: '1px solid #2a2a4a',
              fontSize: '12px',
              color: '#6a6a8a',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <span>💡 提示: 调整低/高阈值可改变边缘精细度</span>
              <span>🎭 四种风格可自由切换并带过渡动画</span>
              <span>✏️ 支持手绘线条/箭头/星形/气泡</span>
              <span>📥 导出透明PNG最高2048px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
