import React from 'react';
import type { Artwork } from '../modules/presetManager';
import '../styles/GalleryPanel.css';

interface GalleryPanelProps {
  artworks: Artwork[];
  onLoad: (artwork: Artwork) => void;
  onDelete: (id: string) => void;
}

const GalleryPanel: React.FC<GalleryPanelProps> = ({ artworks, onLoad, onDelete }) => {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="gallery-panel">
      <div className="gallery-header">
        <h2>我的作品</h2>
        <span className="artwork-count">{artworks.length} 个作品</span>
      </div>

      <div className="gallery-content">
        {artworks.length === 0 ? (
          <div className="empty-gallery">
            <div className="empty-icon">🎨</div>
            <p>还没有保存的作品</p>
            <p className="empty-hint">在编辑器中创建作品后保存</p>
          </div>
        ) : (
          <div className="artwork-grid">
            {artworks.map(artwork => (
              <div
                key={artwork.id}
                className="artwork-card"
                onClick={() => onLoad(artwork)}
              >
                <div className="artwork-thumbnail">
                  {artwork.thumbnail ? (
                    <img src={artwork.thumbnail} alt={artwork.name} />
                  ) : (
                    <div
                      className="thumbnail-placeholder"
                      style={{ backgroundColor: artwork.backgroundColor }}
                    >
                      <span>✨</span>
                    </div>
                  )}
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(artwork.id);
                    }}
                    title="删除作品"
                  >
                    ×
                  </button>
                </div>
                <div className="artwork-info">
                  <div className="artwork-name" title={artwork.name}>
                    {artwork.name}
                  </div>
                  <div className="artwork-date">{formatDate(artwork.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPanel;
