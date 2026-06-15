import React, { useEffect, useState } from 'react';
import { useAnimationStore } from './store/animationStore';
import PresetsPanel from './components/PresetsPanel';
import PreviewArea from './components/PreviewArea';
import ParamsPanel from './components/ParamsPanel';
import ExportModal from './components/ExportModal';

const App: React.FC = () => {
  const { openExport, isPresetsCollapsed, setPresetsCollapsed } = useAnimationStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      setPresetsCollapsed(w < 1200);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [setPresetsCollapsed]);

  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      <nav style={styles.navbar}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Animotion Lab</span>
        </div>
        <button onClick={openExport} style={styles.exportBtn} className="hover-btn">
          导出代码
        </button>
      </nav>

      <div style={styles.body}>
        {isPresetsCollapsed ? (
          <div style={styles.collapsedPresets}>
            <PresetsPanel />
          </div>
        ) : null}

        <div style={styles.mainContent}>
          {!isPresetsCollapsed && (
            <div style={styles.presetsCol}>
              <PresetsPanel />
            </div>
          )}

          <div style={styles.previewCol}>
            <PreviewArea />
          </div>

          <div style={styles.paramsCol}>
            <ParamsPanel />
          </div>
        </div>
      </div>

      <ExportModal />
    </div>
  );
};

const globalCSS = `
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    min-width: 1024px;
    overflow: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f23;
    color: #e0e0e0;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #3a3a5a;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #4a4a6a;
  }

  .preset-card:hover {
    background: #e8e8e8 !important;
    transform: translateX(-4px) scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  .hover-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 20px;
    background: transparent;
    cursor: pointer;
    margin: 0;
    z-index: 2;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    border: 2px solid #fff;
    cursor: pointer;
    margin-top: -6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 4px;
    background: transparent;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    border: 2px solid #fff;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  select {
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 14px;
    padding-right: 28px !important;
  }

  select option {
    background: #2a2a4a;
    color: #e0e0e0;
  }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f23',
    color: '#e0e0e0',
    minWidth: '1024px',
  },
  navbar: {
    height: '56px',
    background: '#16213e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    borderBottom: '1px solid #2a2a4a',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  exportBtn: {
    padding: '8px 20px',
    background: '#2a2a4a',
    color: '#e0e0e0',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  collapsedPresets: {
    flexShrink: 0,
    borderBottom: '1px solid #2a2a4a',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  presetsCol: {
    width: '10%',
    minWidth: '120px',
    maxWidth: '180px',
    flexShrink: 0,
    borderRight: '1px solid #2a2a4a',
    overflow: 'hidden',
  },
  previewCol: {
    flex: '60',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    overflow: 'hidden',
  },
  paramsCol: {
    width: '30%',
    minWidth: '240px',
    maxWidth: '380px',
    flexShrink: 0,
    borderLeft: '1px solid #2a2a4a',
    overflow: 'auto',
  },
};

export default App;
