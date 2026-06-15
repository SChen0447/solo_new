import React, { useState, useRef, useEffect } from 'react';
import { useFontStore } from '../store';
import { allFonts, chineseFonts, englishFonts } from '../fonts';
import { FontItem } from '../types';
import './FontSelector.css';

interface FontDropdownProps {
  label: string;
  value: FontItem;
  onChange: (font: FontItem) => void;
}

const FontDropdown: React.FC<FontDropdownProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (font: FontItem) => {
    onChange(font);
    setIsOpen(false);
  };

  return (
    <div className="font-dropdown" ref={dropdownRef}>
      <label className="font-dropdown__label">{label}</label>
      <div
        className={`font-dropdown__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className="font-dropdown__trigger-text"
          style={{ fontFamily: value.fontFamily }}
        >
          {value.name}
        </span>
        <span className="font-dropdown__arrow">▼</span>
      </div>
      {isOpen && (
        <div className="font-dropdown__menu">
          <div className="font-dropdown__section">
            <div className="font-dropdown__section-title">中文字体</div>
            {chineseFonts.map((font) => (
              <div
                key={font.id}
                className={`font-dropdown__item ${font.id === value.id ? 'is-selected' : ''}`}
                onClick={() => handleSelect(font)}
              >
                <span
                  className="font-dropdown__item-preview"
                  style={{ fontFamily: font.fontFamily }}
                >
                  {font.previewText}
                </span>
                <span className="font-dropdown__item-name">{font.name}</span>
              </div>
            ))}
          </div>
          <div className="font-dropdown__section">
            <div className="font-dropdown__section-title">英文字体</div>
            {englishFonts.map((font) => (
              <div
                key={font.id}
                className={`font-dropdown__item ${font.id === value.id ? 'is-selected' : ''}`}
                onClick={() => handleSelect(font)}
              >
                <span
                  className="font-dropdown__item-preview"
                  style={{ fontFamily: font.fontFamily }}
                >
                  {font.previewText}
                </span>
                <span className="font-dropdown__item-name">{font.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FontSelector: React.FC = () => {
  const { fontTitle, fontBody, updateFontPair } = useFontStore();

  return (
    <div className="font-selector">
      <h3 className="font-selector__title">字体选择</h3>
      <FontDropdown
        label="标题字体"
        value={fontTitle}
        onChange={(font) => updateFontPair('title', font)}
      />
      <FontDropdown
        label="正文字体"
        value={fontBody}
        onChange={(font) => updateFontPair('body', font)}
      />
    </div>
  );
};

export default FontSelector;
