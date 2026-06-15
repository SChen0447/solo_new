import { useState, useRef, useEffect } from 'react';
import { useColorStore } from '../store/colorStore';
import { copyToClipboard, exportToJson, exportToCssVariables } from '../utils/colorUtils';
import type { ExportFormat } from '../types';

export const ExportDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorMapping = useColorStore((state) => state.colorMapping);
  const addToast = useColorStore((state) => state.addToast);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    const content = format === 'json'
      ? exportToJson(colorMapping)
      : exportToCssVariables(colorMapping);

    const success = await copyToClipboard(content);
    if (success) {
      addToast(`配色方案已导出为 ${format.toUpperCase()} 格式并复制到剪贴板`, 'success');
    } else {
      addToast('复制失败，请手动复制', 'error');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button className="export-btn" onClick={() => setIsOpen(!isOpen)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出
      </button>
      {isOpen && (
        <div className="export-dropdown">
          <div className="export-dropdown-item" onClick={() => handleExport('json')}>
            导出为 JSON 格式
          </div>
          <div className="export-dropdown-item" onClick={() => handleExport('css')}>
            导出为 CSS 变量
          </div>
        </div>
      )}
    </div>
  );
};
