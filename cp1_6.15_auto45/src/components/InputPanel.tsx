import React, { useState, useCallback } from 'react';

interface InputPanelProps {
  units: string[];
  onUnitsChange: (units: string[]) => void;
  onGenerate: () => void;
}

const splitText = (text: string): string[] => {
  return text
    .split(/[\s,，。！？；、：""''·…—\-\.\!\?\;\:\"]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const InputPanel: React.FC<InputPanelProps> = ({ units, onUnitsChange, onGenerate }) => {
  const [inputText, setInputText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleSubmit = useCallback(() => {
    if (inputText.trim().length === 0) return;
    const newUnits = splitText(inputText);
    if (newUnits.length > 0) {
      onUnitsChange(newUnits);
      onGenerate();
    }
  }, [inputText, onUnitsChange, onGenerate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleTagClick = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditValue(units[index]);
    },
    [units]
  );

  const handleEditConfirm = useCallback(() => {
    if (editingIndex !== null) {
      const newUnits = [...units];
      if (editValue.trim().length === 0) {
        newUnits.splice(editingIndex, 1);
      } else {
        newUnits[editingIndex] = editValue.trim();
      }
      onUnitsChange(newUnits);
      setEditingIndex(null);
      setEditValue('');
    }
  }, [editingIndex, editValue, units, onUnitsChange]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEditConfirm();
      } else if (e.key === 'Escape') {
        setEditingIndex(null);
        setEditValue('');
      }
    },
    [handleEditConfirm]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newUnits = [...units];
      newUnits.splice(index, 1);
      onUnitsChange(newUnits);
    },
    [units, onUnitsChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            if (e.target.value.length <= 60) setInputText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入一句话或关键词（最多60字）"
          maxLength={60}
          style={{
            width: '640px',
            height: '80px',
            borderRadius: '12px',
            border: '2px solid #bbb',
            background: 'rgba(45, 45, 68, 0.8)',
            color: '#e0e0e0',
            fontSize: '18px',
            padding: '0 24px',
            outline: 'none',
            transition: 'border-color 0.3s ease',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#ff8c00';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#bbb';
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            padding: '8px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) scale(0.98)';
          }}
        >
          生成
        </button>
      </div>

      {units.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            maxWidth: '640px',
          }}
        >
          {units.map((unit, i) => (
            <div
              key={`tag-${i}-${unit}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(180, 130, 230, 0.3)',
                color: '#4a2a5a',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onClick={() => handleTagClick(i)}
            >
              {editingIndex === i ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditConfirm}
                  autoFocus
                  style={{
                    width: '60px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(180,130,230,0.5)',
                    borderRadius: '4px',
                    color: '#4a2a5a',
                    padding: '2px 6px',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <span>{unit}</span>
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(i);
                }}
                style={{
                  cursor: 'pointer',
                  opacity: 0.6,
                  fontSize: '16px',
                  lineHeight: 1,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputPanel;
