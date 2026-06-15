import React, { useState, useCallback, useRef } from 'react';
import ImageUploader from './ImageUploader';
import PaletteDisplay from './PaletteDisplay';
import { extractColors, ExtractedColor } from '../core/colorExtractor';
import {
  generatePalettes,
  exportAsCSSVariables,
  exportAsSCSSVariables,
  exportAsSVG,
  ColorPalette,
} from '../core/paletteGenerator';

type ExportFormat = 'css' | 'scss' | 'svg';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [lockedColors, setLockedColors] = useState<Map<string, boolean>>(new Map());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const exportBtnRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleImageLoad = useCallback(
    async (imgElement: HTMLImageElement) => {
      setLoading(true);
      try {
        const colors = await extractColors(imgElement, 6);
        const unlockedColors = colors.filter((c) => !lockedColors.has(c.hex));
        const lockedEntries: ExtractedColor[] = extractedColors.filter((c) =>
          lockedColors.has(c.hex)
        );
        const merged = [...lockedEntries, ...unlockedColors].slice(0, 8);
        setExtractedColors(merged);
        setPreviewUrl(imgElement.src);
        const newPalettes = generatePalettes(merged);
        setPalettes(newPalettes);
      } catch (err) {
        console.error('颜色提取失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [lockedColors, extractedColors]
  );

  const handleLockToggle = useCallback((hex: string) => {
    setLockedColors((prev) => {
      const next = new Map(prev);
      if (next.has(hex)) {
        next.delete(hex);
      } else {
        next.set(hex, true);
      }
      return next;
    });
  }, []);

  const handleColorEdit = useCallback(
    (paletteIndex: number, variantIndex: number, newHex: string) => {
      setPalettes((prev) => {
        const updated = prev.map((p, pi) => {
          if (pi !== paletteIndex) return p;
          const newVariants = p.variants.map((v, vi) =>
            vi === variantIndex ? { ...v, hex: newHex } : v
          );
          return { ...p, variants: newVariants };
        });
        return updated;
      });
    },
    []
  );

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制到剪贴板');
      }
      setExportMenuOpen(false);
    },
    [showToast]
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (palettes.length === 0) return;
      let content: string;
      switch (format) {
        case 'css':
          content = exportAsCSSVariables(palettes);
          break;
        case 'scss':
          content = exportAsSCSSVariables(palettes);
          break;
        case 'svg':
          content = exportAsSVG(palettes);
          break;
      }
      copyToClipboard(content);
    },
    [palettes, copyToClipboard]
  );

  const colorBarColors = extractedColors.map((c) => c.hex);

  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      <nav style={styles.navbar}>
        <span style={styles.navTitle}>🎨 Palette Forge</span>
        <div ref={exportBtnRef} style={{ position: 'relative' }}>
          <button
            style={{
              ...styles.exportBtn,
              opacity: palettes.length === 0 ? 0.4 : 1,
              cursor: palettes.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={palettes.length === 0}
            onClick={() => setExportMenuOpen((v) => !v)}
          >
            导出 ▾
          </button>
          {exportMenuOpen && palettes.length > 0 && (
            <div style={styles.exportMenu}>
              <button
                style={styles.exportMenuItem}
                onClick={() => handleExport('css')}
              >
                CSS 变量
              </button>
              <button
                style={styles.exportMenuItem}
                onClick={() => handleExport('scss')}
              >
                SCSS 变量
              </button>
              <button
                style={styles.exportMenuItem}
                onClick={() => handleExport('svg')}
              >
                SVG 调色板
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="main-layout" style={styles.main}>
        <aside className="sidebar-area" style={styles.sidebar}>
          <ImageUploader
            onImageLoad={handleImageLoad}
            loading={loading}
            previewUrl={previewUrl}
            extractedColors={colorBarColors}
          />
        </aside>
        <section className="content-area" style={styles.content}>
          <PaletteDisplay
            palettes={palettes}
            lockedColors={lockedColors}
            onLockToggle={handleLockToggle}
            onColorEdit={handleColorEdit}
          />
        </section>
      </div>

      {toast && (
        <div style={styles.toast} className="toast-show">
          {toast}
        </div>
      )}
    </div>
  );
};

const globalCSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: #121212;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-x: hidden;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes toastIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .color-block:hover {
    transform: scale(1.1) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
  }

  .color-block:active {
    transform: scale(0.95) !important;
  }

  .toast-show {
    animation: toastIn 0.3s ease forwards;
  }

  @media (max-width: 768px) {
    .main-layout {
      flex-direction: column !important;
    }
    .sidebar-area {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    .content-area {
      width: 100% !important;
    }
    .palette-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    height: '50px',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  navTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e0e0e0',
    letterSpacing: '0.5px',
  },
  exportBtn: {
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  exportMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 100,
    minWidth: '140px',
  },
  exportMenuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  main: {
    display: 'flex',
    flex: 1,
    gap: '24px',
    padding: '24px',
  },
  sidebar: {
    width: '340px',
    minWidth: '300px',
    maxWidth: '400px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4caf50',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
    zIndex: 2000,
    pointerEvents: 'none',
  },
};

export default App;
