import React, { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  value, 
  onChange, 
  readOnly = false,
  size = 'md'
}) => {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;
  
  const sizeClass = size === 'sm' ? 'star-sm' : size === 'lg' ? 'star-lg' : 'star-md';
  
  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };
  
  return (
    <div className={`star-rating ${sizeClass} ${readOnly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= displayValue ? 'filled' : ''}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHoverValue(star)}
          onMouseLeave={() => !readOnly && setHoverValue(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};
