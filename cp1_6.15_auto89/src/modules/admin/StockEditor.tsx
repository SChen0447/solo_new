import React, { useState, useRef, useEffect } from 'react';
import { useMenuStore } from '../../store';

interface StockEditorProps {
  id: string;
  initialStock: number;
}

const StockEditor: React.FC<StockEditorProps> = ({ id, initialStock }) => {
  const { updateStock, setStockLocal, isLoading } = useMenuStore();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(initialStock));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(String(initialStock));
  }, [initialStock]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = async () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      setValue(String(initialStock));
      setIsEditing(false);
      return;
    }
    setStockLocal(id, num);
    setIsEditing(false);
    await updateStock(id, num);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            setValue(String(initialStock));
            setIsEditing(false);
          }
        }}
        onBlur={handleSubmit}
        style={{
          width: 80,
          height: 32,
          padding: '0 8px',
          border: '1px solid #90caf9',
          borderRadius: 4,
          fontSize: 14,
          textAlign: 'center',
          transition: 'box-shadow 0.2s ease-in-out'
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.3)';
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    );
  }

  return (
    <span
      onClick={() => !isLoading && setIsEditing(true)}
      style={{
        cursor: isLoading ? 'not-allowed' : 'pointer',
        padding: '4px 12px',
        borderRadius: 4,
        backgroundColor: initialStock <= 3 ? '#ffebee' : '#f5f5f5',
        color: initialStock <= 3 ? '#d32f2f' : initialStock === 0 ? '#d32f2f' : '#424242',
        fontWeight: 600,
        fontSize: 14,
        display: 'inline-block',
        minWidth: 50,
        textAlign: 'center',
        transition: 'background-color 0.2s ease-in-out',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = initialStock <= 3 ? '#ffcdd2' : '#eeeeee';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = initialStock <= 3 ? '#ffebee' : '#f5f5f5';
      }}
    >
      {initialStock}
    </span>
  );
};

export default StockEditor;
