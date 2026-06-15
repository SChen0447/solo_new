import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}

export default function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [shaking, setShaking] = useState(0);

  const handleClick = (star: number) => {
    if (readOnly) return;
    onChange?.(star);
    setShaking(star);
    setTimeout(() => setShaking(0), 300);
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={`transition-transform duration-200 ${
              !readOnly ? 'hover:scale-120' : ''
            } ${shaking === star ? 'animate-shake' : ''}`}
          >
            <Star
              className="h-[22px] w-[22px]"
              fill={filled ? '#ffd700' : 'none'}
              stroke={filled ? '#ffd700' : '#ccc'}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
