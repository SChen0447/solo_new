import React from 'react';

interface SkeletonProps {
  count?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonProps> = ({ count = 6, className = '' }) => {
  return (
    <div className={`venue-grid ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="skeleton-content">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text w-75" />
            <div className="skeleton-footer">
              <div className="skeleton skeleton-price" />
              <div className="skeleton skeleton-btn" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonLine: React.FC<{ width?: string; className?: string }> = ({ 
  width = '100%', 
  className = '' 
}) => (
  <div className={`skeleton skeleton-line ${className}`} style={{ width }} />
);
