import { useState, useCallback } from 'react';
import './Input.css';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  label?: string;
  type?: 'text' | 'tel';
}

export default function Input({
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  label,
  type = 'text'
}: InputProps) {
  const [shake, setShake] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onChange(newValue);
  }, [onChange, maxLength]);

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className={`input-wrapper ${shake ? 'shake' : ''} ${error ? 'error' : ''}`}>
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className="input-field"
        />
        {maxLength && (
          <span className="char-count">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
