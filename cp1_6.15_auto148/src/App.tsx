import { History as HistoryIcon } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import UploadZone from './components/UploadZone';
import ColorSwatchBar from './components/ColorSwatchBar';
import HistorySidebar from './components/HistorySidebar';
import ExportPanel from './components/ExportPanel';
import ColorDetailPopup from './components/ColorDetailPopup';
import PaletteRenderer from './modules/color-extraction/PaletteRenderer';
import VariantPanel from './modules/variants/VariantPanel';
import './App.css';

export default function App() {
  const extractedColors = useAppStore((s) => s.extractedColors);
  const selectedColorIndex = useAppStore((s) => s.selectedColorIndex);
  const setSelectedColorIndex = useAppStore((s) => s.setSelectedColorIndex);
  const selectedVariantIndex = useAppStore((s) => s.selectedVariantIndex);
  const setSelectedVariantIndex = useAppStore((s) => s.setSelectedVariantIndex);
  const variantParams = useAppStore((s) => s.variantParams);
  const variants = useAppStore((s) => s.variants);
  const updateVariantParams = useAppStore((s) => s.updateVariantParams);
  const setVariants = useAppStore((s) => s.setVariants);
  const copyHex = useAppStore((s) => s.copyHex);
  const copiedIndex = useAppStore((s) => s.copiedIndex);
  const toggleHistory = useAppStore((s) => s.toggleHistory);

  const baseColor = extractedColors[selectedColorIndex] || null;

  return (
    <div className="app-root">
      <div className="paper-texture" />

      <HistorySidebar />

      <header className="app-header">
        <button
          className="history-toggle-btn"
          onClick={toggleHistory}
          title="历史记录"
        >
          <HistoryIcon size={20} />
        </button>
        <div className="app-title-block">
          <h1 className="app-title">水彩调色板</h1>
          <p className="app-subtitle">
            从灵感图片中提取专属配色 · 手绘风格色卡 · 一键导出创作可用
          </p>
        </div>
      </header>

      <main className="app-main">
        <section className="section upload-section">
          <div className="section-content-row">
            <UploadZone />
            <ColorSwatchBar />
          </div>
        </section>

        <section className="section palette-section">
          <div className="section-header">
            <h2 className="section-title">手绘水彩卡</h2>
            <p className="section-desc">点击任意色卡复制 HEX 色值到剪贴板</p>
          </div>
          <PaletteRenderer
            colors={extractedColors}
            selectedIndex={selectedColorIndex}
            onSelect={setSelectedColorIndex}
            onCopy={copyHex}
            copiedKey={copiedIndex}
            section="primary"
          />
        </section>

        <section className="section variant-section">
          <VariantPanel
            baseColor={baseColor}
            params={variantParams}
            variants={variants}
            onParamsChange={updateVariantParams}
            onVariantsChange={setVariants}
            onCopy={copyHex}
            copiedKey={copiedIndex}
            selectedVariantIndex={selectedVariantIndex}
            onSelectVariant={setSelectedVariantIndex}
          />
        </section>
      </main>

      <ExportPanel />

      <ColorDetailPopup />

      <footer className="app-footer">
        <p>🎨 为独立插画师设计 · 每一次落笔都是灵感绽放</p>
      </footer>
    </div>
  );
}
