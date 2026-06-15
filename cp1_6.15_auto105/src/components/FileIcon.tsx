import React from 'react';
import { getFileIconColor, getFileExtension, getFileCategoryName } from '../utils';

interface FileIconProps {
  filename: string;
  type?: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, type, size = 36 }) => {
  const ext = getFileExtension(filename) || type?.split('/')[1] || 'bin';
  const color = getFileIconColor(ext);
  const category = getFileCategoryName(ext);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: `${color}15`,
        border: `1.5px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        style={{ color }}
      >
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <path
          d="M14 2v6h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 3,
          fontSize: size * 0.18,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: -0.3,
          maxWidth: size - 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={category}
      >
        {ext.slice(0, 4)}
      </span>
    </div>
  );
};
