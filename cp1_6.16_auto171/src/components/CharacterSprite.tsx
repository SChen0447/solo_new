import React from 'react';
import { CharacterType } from '../types';

interface CharacterSpriteProps {
  type: CharacterType;
  color: string;
  size?: number;
}

export const CharacterSprite: React.FC<CharacterSpriteProps> = ({ type, color, size = 60 }) => {
  const style = {
    width: size,
    height: size,
    transition: 'fill 0.3s ease-in-out'
  } as React.CSSProperties;

  switch (type) {
    case 'boy':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <circle cx="50" cy="75" r="20" fill={color} />
          <circle cx="50" cy="35" r="22" fill="#FFD7A8" />
          <ellipse cx="50" cy="18" rx="18" ry="12" fill="#3E2723" />
          <circle cx="42" cy="35" r="3" fill="#212121" />
          <circle cx="58" cy="35" r="3" fill="#212121" />
          <path d="M43 45 Q50 52 57 45" stroke="#D84315" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="80" r="6" fill="#FFD7A8" />
          <circle cx="70" cy="80" r="6" fill="#FFD7A8" />
        </svg>
      );
    case 'girl':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <path d="M30 65 L50 95 L70 65 Z" fill={color} />
          <circle cx="50" cy="35" r="22" fill="#FFD7A8" />
          <path d="M28 25 Q50 5 72 25 Q75 35 70 40 L30 40 Q25 35 28 25" fill="#6D4C41" />
          <circle cx="42" cy="35" r="3" fill="#212121" />
          <circle cx="58" cy="35" r="3" fill="#212121" />
          <ellipse cx="35" cy="30" rx="4" ry="2" fill="#F8BBD9" />
          <ellipse cx="65" cy="30" rx="4" ry="2" fill="#F8BBD9" />
          <path d="M43 45 Q50 52 57 45" stroke="#D84315" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="75" cy="30" r="5" fill="#F48FB1" />
        </svg>
      );
    case 'dog':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <ellipse cx="50" cy="70" rx="30" ry="22" fill={color} />
          <circle cx="50" cy="40" r="25" fill={color} />
          <ellipse cx="28" cy="22" rx="10" ry="18" fill={color} transform="rotate(-20 28 22)" />
          <ellipse cx="72" cy="22" rx="10" ry="18" fill={color} transform="rotate(20 72 22)" />
          <ellipse cx="28" cy="25" rx="5" ry="10" fill="#FFAB91" transform="rotate(-20 28 25)" />
          <ellipse cx="72" cy="25" rx="5" ry="10" fill="#FFAB91" transform="rotate(20 72 25)" />
          <circle cx="40" cy="38" r="4" fill="#212121" />
          <circle cx="60" cy="38" r="4" fill="#212121" />
          <circle cx="41" cy="37" r="1.5" fill="#FFFFFF" />
          <circle cx="61" cy="37" r="1.5" fill="#FFFFFF" />
          <ellipse cx="50" cy="50" rx="6" ry="4" fill="#212121" />
          <ellipse cx="50" cy="58" rx="8" ry="4" fill="#FFAB91" />
          <path d="M44 58 L50 63 L56 58" stroke="#212121" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'cat':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <ellipse cx="50" cy="72" rx="28" ry="20" fill={color} />
          <circle cx="50" cy="42" r="24" fill={color} />
          <polygon points="25,30 35,8 42,25" fill={color} />
          <polygon points="75,30 65,8 58,25" fill={color} />
          <polygon points="30,25 35,14 39,23" fill="#FFAB91" />
          <polygon points="70,25 65,14 61,23" fill="#FFAB91" />
          <ellipse cx="40" cy="42" rx="5" ry="6" fill="#66BB6A" />
          <ellipse cx="60" cy="42" rx="5" ry="6" fill="#66BB6A" />
          <ellipse cx="40" cy="42" rx="2" ry="5" fill="#212121" />
          <ellipse cx="60" cy="42" rx="2" ry="5" fill="#212121" />
          <polygon points="48,52 52,52 50,56" fill="#FF7043" />
          <path d="M50 56 L50 60" stroke="#212121" strokeWidth="1" />
          <path d="M50 60 Q45 64 42 60" stroke="#212121" strokeWidth="1.5" fill="none" />
          <path d="M50 60 Q55 64 58 60" stroke="#212121" strokeWidth="1.5" fill="none" />
          <line x1="20" y1="50" x2="8" y2="48" stroke="#212121" strokeWidth="1" />
          <line x1="20" y1="54" x2="8" y2="56" stroke="#212121" strokeWidth="1" />
          <line x1="80" y1="50" x2="92" y2="48" stroke="#212121" strokeWidth="1" />
          <line x1="80" y1="54" x2="92" y2="56" stroke="#212121" strokeWidth="1" />
        </svg>
      );
    case 'rocket':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <path d="M50 5 L35 45 L35 75 L65 75 L65 45 Z" fill={color} />
          <circle cx="50" cy="40" r="10" fill="#E3F2FD" stroke="#90A4AE" strokeWidth="2" />
          <circle cx="50" cy="40" r="5" fill="#64B5F6" />
          <polygon points="35,55 20,70 35,70" fill="#EF5350" />
          <polygon points="65,55 80,70 65,70" fill="#EF5350" />
          <path d="M35 75 L40 85 L50 80 L60 85 L65 75 Z" fill="#FFC107" />
          <ellipse cx="50" cy="88" rx="8" ry="6" fill="#FF9800" opacity="0.7" />
          <path d="M50 10 L46 25 L50 20 L54 25 Z" fill="#FFFFFF" opacity="0.5" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <polygon
            points="50,8 61,38 93,38 67,57 77,88 50,70 23,88 33,57 7,38 39,38"
            fill={color}
            stroke="#FFA726"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="42" cy="48" r="4" fill="#212121" />
          <circle cx="58" cy="48" r="4" fill="#212121" />
          <circle cx="43" cy="47" r="1.5" fill="#FFFFFF" />
          <circle cx="59" cy="47" r="1.5" fill="#FFFFFF" />
          <path d="M43 60 Q50 67 57 60" stroke="#D84315" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="35" cy="55" r="3" fill="#F8BBD9" opacity="0.7" />
          <circle cx="65" cy="55" r="3" fill="#F8BBD9" opacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
};
