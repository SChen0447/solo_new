import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ExportFormat } from '../types';

const formatOptions: Array<{ value: ExportFormat; label: string; desc: string }> = [
  { value: 'json', label: 'JSON', desc: '包含HSL/RGB/HEX全数据' },
  { value: 'css', label: 'CSS 变量', desc: ':root { --color-* }' },
  { value: 'sketch', label: 'Sketch 调色板', desc: '.clr 格式文件' },
];

export default function ExportPanel() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [showDropdown, setShowDropdown] = useState(false);
  const [justExported, setJustExported] = useState(false);
  const exportPalette = useAppStore((s) => s.exportPalette);
  const extractedColors = useAppStore((s) => s.extractedColors);

  const disabled = extractedColors.length === 0;

  const handleExport = () => {
    if (disabled) return;
    exportPalette(format);
    setJustExported(true);
    setTimeout(() => setJustExported(false), 1400);
  };

  const current = formatOptions.find((f) => f.value === format)!;

  return (
    <div className={`export-panel ${disabled ? 'disabled' : ''}`}>
      <p className="export-title">导出配色方案</p>

      <div className="export-dropdown">
        <button
          className="dropdown-toggle"
          onClick={() => !disabled && setShowDropdown((v) => !v)}
          disabled={disabled}
        >
          <div className="dropdown-selected">
            <span className="dropdown-label">{current.label}</span>
            <span className="dropdown-desc">{current.desc}</span>
          </div>
          <ChevronDown
            size={16}
            className={`dropdown-arrow ${showDropdown ? 'up' : ''}`}
          />
        </button>
        {showDropdown && !disabled && (
          <ul className="dropdown-menu">
            {formatOptions.map((opt) => (
              <li
                key={opt.value}
                className={`dropdown-item ${opt.value === format ? 'active' : ''}`}
                onClick={() => {
                  setFormat(opt.value);
                  setShowDropdown(false);
                }}
              >
                <span className="dropdown-label">{opt.label}</span>
                <span className="dropdown-desc">{opt.desc}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className={`export-btn ${justExported ? 'done' : ''}`}
        onClick={handleExport}
        disabled={disabled}
      >
        <Download size={16} />
        <span>{justExported ? '已导出 ✓' : '导出'}</span>
      </button>
    </div>
  );
}
