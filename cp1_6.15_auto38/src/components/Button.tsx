import { useState, useCallback, type MouseEvent } from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'gold';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button'
}: ButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    if (onClick) {
      onClick(e);
    }
  }, [onClick]);

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className} ${disabled ? 'btn-disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}
      <span className="btn-content">{children}</span>
    </button>
  );
}
