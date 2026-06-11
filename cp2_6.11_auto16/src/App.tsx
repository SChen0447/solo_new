import React, { useState, useEffect, useRef, useCallback } from 'react';
import { saveAs } from 'file-saver';
import ControlPanel from './components/ControlPanel';
import {
  renderSignature,
  animateStroke,
  getColorForStroke,
  adjustColorBrightness,
  SignatureStyle,
  RenderedSignature
} from './signatureRenderer';
import {
  TextureType,
  generateTexturePatterns,
  applyTexture,
  getTextureFill,
  textureConfigs
} from './textureManager';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 150;
const DOWNLOAD_WIDTH = 400;
const DOWNLOAD_HEIGHT = 150;

const styles: SignatureStyle[] = ['handwriting', 'calligraphy', 'cartoon'];
const styleNames: Record<SignatureStyle, string> = {
  handwriting: '手写体',
  calligraphy: '书法体',
  cartoon: '卡通体'
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('张三');
  const [primaryColor, setPrimaryColor] = useState('#2c3e50');
  const [secondaryColor, setSecondaryColor] = useState('#8b4513');
  const [selectedTexture, setSelectedTexture] = useState<TextureType>('white');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const [prevTexture, setPrevTexture] = useState<TextureType>('white');
  const [textureTransition, setTextureTransition] = useState(0);

  const svgRefs = useRef<Map<SignatureStyle, SVGSVGElement>>(new Map());
  const signatureDataRef = useRef<Map<SignatureStyle, RenderedSignature>>(new Map());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isPanelOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isPanelOpen, isMobile]);

  useEffect(() => {
    if (inputText.length >= 2) {
      const timer = setTimeout(() => {
        generateSignatures();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedTexture, primaryColor, secondaryColor]);

  const textureConfig = applyTexture(selectedTexture);
  const adjustedPrimary = adjustColorBrightness(primaryColor, textureConfig.colorAdjustment);
  const adjustedSecondary = adjustColorBrightness(secondaryColor, textureConfig.colorAdjustment);

  const generateSignatures = useCallback(() => {
    setIsGenerating(true);
    setFadeKey(prev => prev + 1);

    styles.forEach(style => {
      const sigData = renderSignature(inputText || '签名', style, adjustedPrimary, adjustedSecondary);
      signatureDataRef.current.set(style, sigData);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        styles.forEach(style => {
          const svg = svgRefs.current.get(style);
          if (!svg) return;
          const paths = svg.querySelectorAll<SVGPathElement>('path.signature-stroke');
          paths.forEach((path, index) => {
            const stroke = signatureDataRef.current.get(style)?.strokes[index];
            animateStroke(path, stroke?.duration || 0.3, stroke?.delay || index * 0.06);
          });
        });

        setTimeout(() => {
          setIsGenerating(false);
        }, 800);
      });
    });
  }, [inputText, adjustedPrimary, adjustedSecondary]);

  const handleTextureChange = useCallback((texture: TextureType) => {
    if (texture === selectedTexture) return;
    setPrevTexture(selectedTexture);
    setTextureTransition(0);

    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setTextureTransition(eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSelectedTexture(texture);
        setPrevTexture(texture);
        setTextureTransition(0);
      }
    };

    if (selectedTexture !== texture) {
      setSelectedTexture(texture);
    }
    requestAnimationFrame(animate);
  }, [selectedTexture]);

  const handleDownload = useCallback(async () => {
    const style = styles[0];
    const svg = svgRefs.current.get(style);
    if (!svg) return;

    const dpr = Math.max(1, window.devicePixelRatio || 2);
    const outputScale = Math.max(dpr, 2);

    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('width', String(DOWNLOAD_WIDTH));
    svgClone.setAttribute('height', String(DOWNLOAD_HEIGHT));
    const bgRect = svgClone.querySelector('rect');
    if (bgRect) bgRect.setAttribute('fill-opacity', '0');

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);
    if (!svgString.includes('xmlns=')) {
      svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([
      '<?xml version="1.0" encoding="UTF-8"?>\n',
      svgString
    ], { type: 'image/svg+xml;charset=utf-8' });

    const img = new Image();
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = DOWNLOAD_WIDTH * outputScale;
    canvas.height = DOWNLOAD_HEIGHT * outputScale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    ctx.scale(outputScale, outputScale);
    ctx.clearRect(0, 0, DOWNLOAD_WIDTH, DOWNLOAD_HEIGHT);
    ctx.drawImage(img, 0, 0, DOWNLOAD_WIDTH, DOWNLOAD_HEIGHT);

    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeRect(1, 1, DOWNLOAD_WIDTH - 2, DOWNLOAD_HEIGHT - 2);

    const sigData = signatureDataRef.current.get(style);
    let watermarkX: number;
    const watermarkText = '✒ 签名生成器';
    ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    const textMetrics = ctx.measureText(watermarkText);
    const textWidth = textMetrics.width;
    const margin = 8;

    if (sigData && sigData.charPositions.length > 0) {
      const lastChar = sigData.charPositions[sigData.charPositions.length - 1];
      const lastCharEnd = lastChar.centerX + lastChar.width / 2;
      const fallbackX = DOWNLOAD_WIDTH - textWidth - margin;
      watermarkX = Math.min(fallbackX, Math.max(lastCharEnd + margin, margin));
    } else {
      watermarkX = DOWNLOAD_WIDTH - textWidth - margin;
    }

    ctx.fillStyle = 'rgba(74, 74, 74, 0.25)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(watermarkText, watermarkX, DOWNLOAD_HEIGHT - 6);

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${inputText || 'signature'}-个性签名.png`);
      }
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  }, [inputText]);

  const renderSignatureSVG = (style: SignatureStyle) => {
    const signature = renderSignature(inputText || '签名', style, adjustedPrimary, adjustedSecondary);
    signatureDataRef.current.set(style, signature);

    const renderBackgrounds = () => {
      if (textureTransition > 0 && textureTransition < 1 && prevTexture !== selectedTexture) {
        return (
          <>
            <rect
              x="0" y="0"
              width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
              fill={getTextureFill(prevTexture)}
              opacity={1 - textureTransition}
            />
            <rect
              x="0" y="0"
              width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
              fill={getTextureFill(selectedTexture)}
              opacity={textureTransition}
            />
          </>
        );
      }
      return (
        <rect
          x="0" y="0"
          width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          fill={getTextureFill(selectedTexture)}
        />
      );
    };

    return (
      <div key={`${style}-${fadeKey}`} className="signature-wrapper">
        <div className="signature-label">{styleNames[style]}</div>
        <svg
          ref={(el) => {
            if (el) svgRefs.current.set(style, el);
          }}
          viewBox={signature.viewBox}
          className="signature-svg"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <defs dangerouslySetInnerHTML={{ __html: generateTexturePatterns() }} />
          {renderBackgrounds()}
          <defs>
            <linearGradient id={`grad-${style}-${fadeKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={adjustedPrimary} />
              <stop offset="50%" stopColor={adjustColorBrightness(adjustedPrimary, (adjustColorBrightness(adjustedSecondary, 0) as any) - adjustColorBrightness(adjustedPrimary, 0) as any)} />
              <stop offset="100%" stopColor={adjustedSecondary} />
            </linearGradient>
          </defs>
          {signature.strokes.map((stroke, index) => (
            <path
              key={`${style}-${index}-${stroke.delay}`}
              className="signature-stroke"
              d={stroke.path}
              fill="none"
              stroke={getColorForStroke(
                stroke,
                signature.strokes,
                signature.charPositions,
                adjustedPrimary,
                adjustedSecondary,
                CANVAS_WIDTH
              )}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">✒️ 个性签名生成器</h1>
          <p className="app-subtitle">在线生成多种艺术风格签名</p>
        </div>
        <div className="texture-indicator">
          {textureConfigs.map(t => (
            <button
              key={t.id}
              className={`texture-dot ${selectedTexture === t.id ? 'active' : ''}`}
              onClick={() => handleTextureChange(t.id)}
              title={t.name}
              style={{ backgroundColor: t.thumbnailColor }}
            />
          ))}
        </div>
      </header>

      <main className="app-main">
        <section className="preview-section">
          <div className="signatures-grid">
            {styles.map(style => (
              <div key={style} className="signature-card">
                {renderSignatureSVG(style)}
              </div>
            ))}
          </div>
        </section>

        <ControlPanel
          inputText={inputText}
          onInputChange={setInputText}
          primaryColor={primaryColor}
          onPrimaryColorChange={setPrimaryColor}
          secondaryColor={secondaryColor}
          onSecondaryColorChange={setSecondaryColor}
          selectedTexture={selectedTexture}
          onTextureChange={handleTextureChange}
          onGenerate={generateSignatures}
          onDownload={handleDownload}
          isGenerating={isGenerating}
          isMobile={isMobile}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      </main>

      {isMobile && (
        <button
          className={`floating-toggle-btn ${isPanelOpen ? 'hidden' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsPanelOpen(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsPanelOpen(true);
          }}
          aria-label="展开控制面板"
        >
          <span className="floating-icon">⚙️</span>
          <span className="floating-text">设置</span>
        </button>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          background-color: #faf8f5;
          color: #3a3a3a;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body.no-scroll {
          overflow: hidden;
          position: fixed;
          width: 100%;
        }

        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #f2ece0 100%);
          position: relative;
        }

        .app-header {
          padding: 20px 32px;
          border-bottom: 1px solid #e8e0d4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .app-title {
          font-size: 24px;
          font-weight: 700;
          color: #2c2c2c;
          letter-spacing: 0.5px;
        }

        .app-subtitle {
          font-size: 13px;
          color: #7a7a7a;
        }

        .texture-indicator {
          display: flex;
          gap: 8px;
        }

        .texture-dot {
          width: 28px;
          height: 28px;
          min-width: 28px;
          min-height: 28px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .texture-dot:hover {
          transform: scale(1.12) translateY(-1px);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }

        .texture-dot.active {
          border-color: #8b7355;
          transform: scale(1.05);
          box-shadow: 0 0 0 3px rgba(139, 115, 85, 0.18);
        }

        .app-main {
          display: flex;
          padding: 28px 32px;
          gap: 32px;
          min-height: calc(100vh - 84px);
          position: relative;
        }

        .preview-section {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 8px 0;
        }

        .signatures-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          max-width: 520px;
        }

        .signature-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px 20px 24px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05), 0 1px 4px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(232, 224, 212, 0.6);
        }

        .signature-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: fadeSlideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .signature-label {
          font-size: 13px;
          font-weight: 600;
          color: #5a5a5a;
          padding: 5px 14px;
          background: linear-gradient(135deg, #f5efe4 0%, #f0e9dc 100%);
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        .signature-svg {
          width: 100%;
          max-width: 400px;
          height: auto;
          border-radius: 6px;
          display: block;
          background: transparent;
        }

        .control-panel {
          width: 340px;
          min-width: 320px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03);
          align-self: flex-start;
          position: sticky;
          top: 108px;
          max-height: calc(100vh - 140px);
          overflow-y: auto;
          border: 1px solid rgba(232, 224, 212, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          scrollbar-width: thin;
          scrollbar-color: #d4c8b4 transparent;
        }

        .control-panel::-webkit-scrollbar {
          width: 6px;
        }

        .control-panel::-webkit-scrollbar-thumb {
          background: #d4c8b4;
          border-radius: 3px;
        }

        .control-panel-mobile {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 20px 20px 0 0;
          padding: 20px 20px 28px;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12), 0 -2px 8px rgba(0, 0, 0, 0.06);
          z-index: 1000;
          transform: translateY(105%);
          transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          max-height: 82vh;
          overflow-y: auto;
          min-width: 320px;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .control-panel-mobile.open {
          transform: translateY(0);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f0ebe0;
        }

        .panel-title {
          font-size: 17px;
          font-weight: 700;
          color: #2c2c2c;
        }

        .close-btn {
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          border: none;
          background: #f5f0e6;
          border-radius: 50%;
          font-size: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #5a5a5a;
          line-height: 1;
        }

        .close-btn:hover {
          background: #ece4d2;
          transform: rotate(90deg);
        }

        .close-btn:active {
          transform: scale(0.92);
        }

        .panel-section {
          margin-bottom: 26px;
        }

        .panel-section:last-child {
          margin-bottom: 0;
        }

        .section-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #5a5a5a;
          margin-bottom: 10px;
          letter-spacing: 0.3px;
        }

        .text-input {
          width: 100%;
          padding: 13px 15px;
          border: 1px solid #e0d8cc;
          border-radius: 6px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 12px;
          background: #fdfcfa;
        }

        .text-input:focus {
          border-color: #8b7355;
          background: white;
          box-shadow: 0 0 0 3px rgba(139, 115, 85, 0.12);
        }

        .text-input::placeholder {
          color: #b8ad9a;
        }

        .generate-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #8b7355 0%, #7a6245 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(139, 115, 85, 0.25);
          letter-spacing: 0.5px;
        }

        .generate-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #7a6245 0%, #6b5337 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 115, 85, 0.32);
        }

        .generate-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(139, 115, 85, 0.25);
        }

        .generate-btn:disabled {
          background: linear-gradient(135deg, #c0b8a8 0%, #b0a898 100%);
          cursor: not-allowed;
          opacity: 0.75;
          box-shadow: none;
        }

        .color-row {
          display: flex;
          gap: 14px;
          margin-bottom: 14px;
        }

        .color-item {
          flex: 1;
        }

        .color-label {
          display: block;
          font-size: 12px;
          color: #7a7a7a;
          margin-bottom: 7px;
          font-weight: 500;
        }

        .color-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fdfcfa;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #ebe3d3;
        }

        .color-picker {
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          padding: 0;
          background: none;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .color-picker::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-picker::-webkit-color-swatch {
          border: none;
          border-radius: 6px;
        }

        .color-hex {
          font-size: 12px;
          color: #6a6a6a;
          font-family: "SF Mono", "Consolas", monospace;
          font-weight: 500;
          text-transform: uppercase;
        }

        .preset-colors {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 7px;
        }

        .preset-color {
          width: 100%;
          min-height: 28px;
          aspect-ratio: 1;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .preset-color:hover {
          transform: scale(1.15);
          z-index: 5;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .preset-color.active {
          border-color: #8b7355;
          transform: scale(1.08);
          box-shadow: 0 0 0 2px rgba(139, 115, 85, 0.2);
        }

        .texture-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        .texture-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 10px 4px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: none;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 44px;
          min-height: 44px;
          justify-content: center;
        }

        .texture-item:hover {
          background: #f8f3ea;
          transform: translateY(-2px);
        }

        .texture-item.active {
          border-color: #8b7355;
          background: #fdf8ee;
          box-shadow: 0 2px 8px rgba(139, 115, 85, 0.15);
        }

        .texture-thumbnail {
          width: 38px;
          height: 38px;
          min-width: 38px;
          min-height: 38px;
          border-radius: 8px;
          border: 1px solid rgba(224, 216, 204, 0.8);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .texture-name {
          font-size: 11px;
          color: #6a6a6a;
          font-weight: 500;
        }

        .download-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 3px 12px rgba(44, 62, 80, 0.28);
          letter-spacing: 0.5px;
          transform-origin: center;
        }

        .download-btn:hover {
          background: linear-gradient(135deg, #1a252f 0%, #0d1318 100%);
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(44, 62, 80, 0.35);
        }

        .download-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 2px 6px rgba(44, 62, 80, 0.25);
        }

        .floating-toggle-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 64px;
          height: 64px;
          min-width: 64px;
          min-height: 64px;
          border-radius: 20px;
          background: linear-gradient(135deg, #8b7355 0%, #7a6245 100%);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(139, 115, 85, 0.45), 0 2px 6px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          z-index: 999;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          padding: 0;
        }

        .floating-toggle-btn.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.8);
        }

        .floating-toggle-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 28px rgba(139, 115, 85, 0.55), 0 3px 8px rgba(0, 0, 0, 0.15);
        }

        .floating-toggle-btn:active {
          transform: scale(0.95);
        }

        .floating-icon {
          font-size: 22px;
          line-height: 1;
        }

        .floating-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          line-height: 1;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: linear-gradient(90deg, #e8e0d4, #d4c8b4);
          border-radius: 3px;
          outline: none;
          transition: background 0.2s ease-out;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #fff 0%, #f8f4ec 100%);
          border: 2px solid #8b7355;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(139, 115, 85, 0.25);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 3px 10px rgba(139, 115, 85, 0.4);
        }

        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.92);
          transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #fff 0%, #f8f4ec 100%);
          border: 2px solid #8b7355;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(139, 115, 85, 0.25);
        }

        .texture-item,
        .close-btn,
        .preset-color,
        .generate-btn,
        .download-btn {
          min-height: 44px;
          min-width: 44px;
          touch-action: manipulation;
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 14px 18px;
            gap: 12px;
          }

          .app-title {
            font-size: 19px;
          }

          .app-subtitle {
            font-size: 11px;
          }

          .texture-indicator {
            flex-wrap: wrap;
            gap: 5px;
            justify-content: flex-end;
            max-width: 50%;
          }

          .texture-dot {
            width: 22px;
            height: 22px;
            min-width: 22px;
            min-height: 22px;
            border-radius: 5px;
          }

          .app-main {
            flex-direction: column;
            padding: 14px 16px 110px;
            gap: 14px;
            min-height: auto;
          }

          .preview-section {
            width: 100%;
          }

          .signatures-grid {
            gap: 14px;
            max-width: 100%;
          }

          .signature-card {
            padding: 12px;
            border-radius: 10px;
          }

          .signature-wrapper {
            gap: 10px;
          }

          .signature-svg {
            max-width: 100%;
          }

          .signature-label {
            font-size: 12px;
            padding: 4px 11px;
          }

          .control-panel-mobile {
            padding: 18px 18px 32px;
            max-height: 84vh;
            z-index: 1001;
          }

          .panel-header {
            margin-bottom: 16px;
            padding-bottom: 12px;
          }

          .panel-section {
            margin-bottom: 22px;
          }

          .texture-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
          }

          .texture-item {
            padding: 8px 2px;
            gap: 5px;
          }

          .texture-thumbnail {
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
          }

          .texture-name {
            font-size: 10px;
          }

          .preset-colors {
            gap: 5px;
          }

          .floating-toggle-btn {
            bottom: 20px;
            right: 20px;
            width: 68px;
            height: 68px;
            min-width: 68px;
            min-height: 68px;
            border-radius: 22px;
          }

          .close-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
          }

          .color-row {
            gap: 10px;
          }

          .color-picker {
            width: 34px;
            height: 34px;
            min-width: 34px;
            min-height: 34px;
          }
        }

        @media (max-width: 420px) {
          .app-title {
            font-size: 17px;
          }

          .preset-colors {
            grid-template-columns: repeat(8, 1fr);
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
