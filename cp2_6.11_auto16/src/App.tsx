import React, { useState, useEffect, useRef, useCallback } from 'react';
import { saveAs } from 'file-saver';
import ControlPanel from './components/ControlPanel';
import {
  renderSignature,
  animateStroke,
  getColorForStroke,
  adjustColorBrightness,
  SignatureStyle
} from './signatureRenderer';
import {
  TextureType,
  generateTexturePatterns,
  applyTexture,
  getTextureFill
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
  const [downloadBtnScale, setDownloadBtnScale] = useState(1);
  const [, forceUpdate] = useState(0);

  const svgRefs = useRef<Map<SignatureStyle, SVGSVGElement>>(new Map());
  const bgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (inputText.length >= 2) {
      generateSignatures();
    }
  }, [selectedTexture, primaryColor, secondaryColor]);

  const textureConfig = applyTexture(selectedTexture);
  const adjustedPrimary = adjustColorBrightness(primaryColor, textureConfig.colorAdjustment);
  const adjustedSecondary = adjustColorBrightness(secondaryColor, textureConfig.colorAdjustment);

  const generateSignatures = useCallback(() => {
    setIsGenerating(true);
    setFadeKey(prev => prev + 1);

    setTimeout(() => {
      styles.forEach(style => {
        const svg = svgRefs.current.get(style);
        if (!svg) return;

        const paths = svg.querySelectorAll<SVGPathElement>('path.signature-stroke');
        paths.forEach((path, index) => {
          animateStroke(path, 0.3, index * 0.05);
        });
      });

      setTimeout(() => {
        setIsGenerating(false);
      }, 600);
    }, 50);
  }, []);

  const handleTextureChange = useCallback((texture: TextureType) => {
    if (bgContainerRef.current) {
      bgContainerRef.current.style.transition = 'opacity 0.6s ease-in-out';
      bgContainerRef.current.style.opacity = '0.3';
      setTimeout(() => {
        setSelectedTexture(texture);
        forceUpdate(prev => prev + 1);
        if (bgContainerRef.current) {
          bgContainerRef.current.style.opacity = '1';
        }
      }, 300);
    } else {
      setSelectedTexture(texture);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloadBtnScale(0.9);
    setTimeout(() => setDownloadBtnScale(1.1), 150);
    setTimeout(() => setDownloadBtnScale(1), 300);

    const style = styles[0];
    const svg = svgRefs.current.get(style);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([
      `<?xml version="1.0" encoding="UTF-8"?>\n`,
      svgData
    ], { type: 'image/svg+xml;charset=utf-8' });

    const img = new Image();
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = DOWNLOAD_WIDTH;
    canvas.height = DOWNLOAD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    ctx.clearRect(0, 0, DOWNLOAD_WIDTH, DOWNLOAD_HEIGHT);
    ctx.drawImage(img, 0, 0, DOWNLOAD_WIDTH, DOWNLOAD_HEIGHT);

    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, DOWNLOAD_WIDTH - 2, DOWNLOAD_HEIGHT - 2);

    ctx.fillStyle = 'rgba(74, 74, 74, 0.3)';
    ctx.font = '8px sans-serif';
    ctx.fillText('签名生成器', DOWNLOAD_WIDTH - 58, DOWNLOAD_HEIGHT - 6);

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${inputText || 'signature'}-签名.png`);
      }
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [inputText]);

  const renderSignatureSVG = (style: SignatureStyle) => {
    const signature = renderSignature(inputText || '签名', style, adjustedPrimary, adjustedSecondary);
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
        >
          <defs dangerouslySetInnerHTML={{ __html: generateTexturePatterns() }} />
          <rect
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill={getTextureFill(selectedTexture)}
          />
          <defs>
            <linearGradient id={`grad-${style}-${fadeKey}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={adjustedPrimary} />
              <stop offset="100%" stopColor={adjustedSecondary} />
            </linearGradient>
          </defs>
          {signature.strokes.map((stroke, index) => (
            <path
              key={index}
              className="signature-stroke"
              d={stroke.path}
              fill="none"
              stroke={getColorForStroke(index, signature.strokes.length, adjustedPrimary, adjustedSecondary)}
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
      </header>

      <main className="app-main">
        <section className="preview-section" ref={bgContainerRef}>
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
          className="floating-toggle-btn"
          onClick={() => setIsPanelOpen(true)}
          style={{ display: isPanelOpen ? 'none' : 'flex' }}
        >
          ⚙️ 设置
        </button>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          background-color: #faf8f5;
          color: #3a3a3a;
          min-height: 100vh;
        }

        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%);
        }

        .app-header {
          padding: 20px 32px;
          border-bottom: 1px solid #e8e0d4;
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

        .app-main {
          display: flex;
          padding: 24px 32px;
          gap: 32px;
          min-height: calc(100vh - 80px);
        }

        .preview-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.6s ease-in-out;
        }

        .signatures-grid {
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
          max-width: 500px;
        }

        .signature-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: transform 0.5s ease, opacity 0.5s ease;
        }

        .signature-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .signature-label {
          font-size: 14px;
          font-weight: 600;
          color: #5a5a5a;
          padding: 4px 12px;
          background: #f0ebe3;
          border-radius: 4px;
        }

        .signature-svg {
          width: 100%;
          max-width: 400px;
          height: auto;
          border-radius: 4px;
        }

        .control-panel {
          width: 340px;
          min-width: 320px;
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
          align-self: flex-start;
          position: sticky;
          top: 24px;
          max-height: calc(100vh - 128px);
          overflow-y: auto;
        }

        .control-panel-mobile {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 16px 16px 0 0;
          padding: 20px;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          transform: translateY(100%);
          transition: transform 0.3s ease-out;
          max-height: 85vh;
          overflow-y: auto;
          min-width: 320px;
        }

        .control-panel-mobile.open {
          transform: translateY(0);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #2c2c2c;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f0f0f0;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background: #e0e0e0;
        }

        .panel-section {
          margin-bottom: 24px;
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
        }

        .text-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e0d8cc;
          border-radius: 4px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 12px;
        }

        .text-input:focus {
          border-color: #8b7355;
        }

        .generate-btn {
          width: 100%;
          padding: 12px;
          background: #8b7355;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .generate-btn:hover:not(:disabled) {
          background: #7a6245;
        }

        .generate-btn:disabled {
          background: #c0b8a8;
          cursor: not-allowed;
        }

        .color-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .color-item {
          flex: 1;
        }

        .color-label {
          display: block;
          font-size: 12px;
          color: #7a7a7a;
          margin-bottom: 6px;
        }

        .color-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-picker {
          width: 40px;
          height: 40px;
          border: 1px solid #e0d8cc;
          border-radius: 4px;
          cursor: pointer;
          padding: 2px;
          background: white;
        }

        .color-hex {
          font-size: 12px;
          color: #5a5a5a;
          font-family: monospace;
        }

        .preset-colors {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
        }

        .preset-color {
          width: 100%;
          aspect-ratio: 1;
          border: 2px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }

        .preset-color:hover {
          transform: scale(1.1);
        }

        .preset-color.active {
          border-color: #8b7355;
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
          gap: 6px;
          padding: 8px 4px;
          border: 2px solid transparent;
          border-radius: 4px;
          background: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .texture-item:hover {
          background: #f5f0e8;
        }

        .texture-item.active {
          border-color: #8b7355;
          background: #faf5ee;
        }

        .texture-thumbnail {
          width: 36px;
          height: 36px;
          border-radius: 4px;
          border: 1px solid #e0d8cc;
        }

        .texture-name {
          font-size: 11px;
          color: #5a5a5a;
        }

        .download-btn {
          width: 100%;
          padding: 14px;
          background: #2c3e50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          transform: scale(var(--btn-scale, 1));
        }

        .download-btn:hover {
          background: #1a252f;
        }

        .floating-toggle-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #8b7355;
          color: white;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(139, 115, 85, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          transition: transform 0.2s;
        }

        .floating-toggle-btn:hover {
          transform: scale(1.05);
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: #e8e0d4;
          border-radius: 3px;
          outline: none;
          transition: all 0.2s ease-out;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: #8b7355;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s ease-out;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        input[type="range"]:active::-webkit-slider-thumb {
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 16px 20px;
          }

          .app-title {
            font-size: 20px;
          }

          .app-main {
            flex-direction: column;
            padding: 16px 20px 100px;
            gap: 16px;
          }

          .preview-section {
            width: 100%;
          }

          .signatures-grid {
            gap: 16px;
          }

          .signature-card {
            padding: 12px;
          }

          .signature-svg {
            max-width: 100%;
          }

          .control-panel {
            width: 100%;
            min-width: auto;
            position: static;
            max-height: none;
          }

          .texture-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .texture-thumbnail {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
