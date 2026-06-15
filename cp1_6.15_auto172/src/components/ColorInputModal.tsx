import { useState, useEffect } from 'react';
import { useColorStore } from '../store/colorStore';
import { isValidHex, isValidRgb, rgbToHex, normalizeHex, hexToRgb } from '../utils/colorUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ColorInputModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [inputMode, setInputMode] = useState<'hex' | 'rgb'>('hex');
  const [hexInput, setHexInput] = useState('#1976D2');
  const [rgbR, setRgbR] = useState<string>('25');
  const [rgbG, setRgbG] = useState<string>('118');
  const [rgbB, setRgbB] = useState<string>('210');
  const [nameInput, setNameInput] = useState('');
  const [previewColor, setPreviewColor] = useState('#1976D2');
  const [error, setError] = useState('');

  const addCustomColor = useColorStore((state) => state.addCustomColor);
  const addToast = useColorStore((state) => state.addToast);

  useEffect(() => {
    updatePreview();
  }, [hexInput, rgbR, rgbG, rgbB, inputMode]);

  const updatePreview = () => {
    let validColor = '';
    if (inputMode === 'hex') {
      if (isValidHex(hexInput)) {
        validColor = normalizeHex(hexInput);
        setError('');
      } else {
        setError('请输入有效的 HEX 颜色值（如 #FF5733 或 FFF）');
      }
    } else {
      const r = parseInt(rgbR);
      const g = parseInt(rgbG);
      const b = parseInt(rgbB);
      if (isValidRgb(r, g, b)) {
        validColor = rgbToHex(r, g, b);
        setError('');
      } else {
        setError('RGB 值需在 0-255 范围内');
      }
    }
    setPreviewColor(validColor || '#CCCCCC');
  };

  const handleConfirm = () => {
    if (error) {
      addToast('颜色值无效', 'error');
      return;
    }
    if (inputMode === 'hex' && !isValidHex(hexInput)) {
      addToast('请输入有效的 HEX 颜色', 'error');
      return;
    }
    if (inputMode === 'rgb') {
      const r = parseInt(rgbR);
      const g = parseInt(rgbG);
      const b = parseInt(rgbB);
      if (!isValidRgb(r, g, b)) {
        addToast('请输入有效的 RGB 颜色', 'error');
        return;
      }
    }
    const finalHex = normalizeHex(
      inputMode === 'hex'
        ? hexInput
        : rgbToHex(parseInt(rgbR), parseInt(rgbG), parseInt(rgbB))
    );
    addCustomColor(finalHex, nameInput || undefined);
    addToast(`已添加自定义颜色 ${finalHex}`, 'success');
    handleClose();
  };

  const handleClose = () => {
    setHexInput('#1976D2');
    setRgbR('25');
    setRgbG('118');
    setRgbB('210');
    setNameInput('');
    setError('');
    onClose();
  };

  const handleSyncFromHex = () => {
    const rgb = hexToRgb(hexInput);
    if (rgb) {
      setRgbR(rgb.r.toString());
      setRgbG(rgb.g.toString());
      setRgbB(rgb.b.toString());
    }
  };

  const handleSyncFromRgb = () => {
    const r = parseInt(rgbR);
    const g = parseInt(rgbG);
    const b = parseInt(rgbB);
    if (isValidRgb(r, g, b)) {
      setHexInput(rgbToHex(r, g, b));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">添加自定义颜色</div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`btn-${inputMode === 'hex' ? 'primary' : 'secondary'}`}
            onClick={() => setInputMode('hex')}
            style={{ flex: 1 }}
          >
            HEX
          </button>
          <button
            className={`btn-${inputMode === 'rgb' ? 'primary' : 'secondary'}`}
            onClick={() => setInputMode('rgb')}
            style={{ flex: 1 }}
          >
            RGB
          </button>
        </div>

        {inputMode === 'hex' ? (
          <div className="input-group">
            <label className="input-label">HEX 颜色值</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                placeholder="#FF5733"
                onBlur={handleSyncFromHex}
              />
            </div>
          </div>
        ) : (
          <div className="input-group">
            <label className="input-label">RGB 颜色值</label>
            <div className="rgb-inputs">
              <input
                type="number"
                className="input-field"
                value={rgbR}
                onChange={(e) => setRgbR(e.target.value)}
                placeholder="R"
                min="0"
                max="255"
                onBlur={handleSyncFromRgb}
              />
              <input
                type="number"
                className="input-field"
                value={rgbG}
                onChange={(e) => setRgbG(e.target.value)}
                placeholder="G"
                min="0"
                max="255"
                onBlur={handleSyncFromRgb}
              />
              <input
                type="number"
                className="input-field"
                value={rgbB}
                onChange={(e) => setRgbB(e.target.value)}
                placeholder="B"
                min="0"
                max="255"
                onBlur={handleSyncFromRgb}
              />
            </div>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">颜色名称（可选）</label>
          <input
            type="text"
            className="input-field"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="如 主色调蓝"
          />
        </div>

        <div className="input-group">
          <label className="input-label">颜色预览</label>
          <div
            className="modal-preview"
            style={{ backgroundColor: previewColor }}
          />
          <div style={{ fontSize: '12px', color: error ? '#f44336' : '#999', marginTop: '4px' }}>
            {error || `转换后的 HEX: ${previewColor.toUpperCase()}`}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            添加
          </button>
        </div>
      </div>
    </div>
  );
};
