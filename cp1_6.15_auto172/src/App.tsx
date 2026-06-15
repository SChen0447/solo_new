import { ColorPalette } from './ColorPalette';
import { ColorPreview } from './ColorPreview';
import { Toast } from './components/Toast';
import { ExportDropdown } from './components/ExportDropdown';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="#1976d2" stroke="none"/>
            <circle cx="17.5" cy="10.5" r=".5" fill="#1976d2" stroke="none"/>
            <circle cx="8.5" cy="7.5" r=".5" fill="#1976d2" stroke="none"/>
            <circle cx="6.5" cy="12.5" r=".5" fill="#1976d2" stroke="none"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
          <h1 className="app-title">配色方案工作室</h1>
          <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
            Color Palette Studio
          </span>
        </div>
        <ExportDropdown />
      </header>

      <div className="main-content">
        <ColorPalette />
        <ColorPreview />
      </div>

      <Toast />
    </div>
  );
};

export default App;
