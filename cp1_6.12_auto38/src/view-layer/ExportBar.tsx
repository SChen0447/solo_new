import React from 'react';
import { usePhotoStore } from '../data-layer/photoStore';
import { PRESET_TAGS, CUSTOM_TAG_COLOR } from '../data-layer/types';

const ExportBar: React.FC = () => {
  const { selectMode, selectedPhotoIds, allPhotos, toggleSelectMode, clearSelection } = usePhotoStore();

  const selectedPhotos = allPhotos.filter(p => selectedPhotoIds.includes(p.id));

  const getTagColor = (tagName: string): string => {
    const preset = PRESET_TAGS.find(t => t.name === tagName);
    return preset ? preset.color : CUSTOM_TAG_COLOR;
  };

  const generateHTML = (): string => {
    const photosHTML = selectedPhotos
      .sort((a, b) => a.order - b.order)
      .map(photo => `
        <div class="export-photo-card">
          <img src="${photo.thumbnail}" alt="照片" />
          <div class="export-photo-info">
            <div class="export-date">${photo.date}</div>
            <div class="export-tags">
              ${photo.tags.map(tag => `
                <span class="export-tag" style="background-color: ${getTagColor(tag)}">${tag}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>精选照片合集</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #FAF0E6;
      color: #333;
      padding: 24px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header p {
      color: #666;
    }
    .export-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .export-photo-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .export-photo-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
    }
    .export-photo-info {
      padding: 12px 16px;
    }
    .export-date {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .export-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .export-tag {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      color: white;
    }
    .download-btn-container {
      text-align: center;
      margin-top: 32px;
    }
    .download-btn {
      padding: 12px 32px;
      background: #45B7D1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    .download-btn:hover {
      background: #3498db;
    }
    @media (max-width: 1024px) {
      .export-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .export-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 精选照片合集</h1>
    <p>共 ${selectedPhotos.length} 张照片</p>
  </div>
  <div class="export-grid">
    ${photosHTML}
  </div>
  <div class="download-btn-container">
    <button class="download-btn" onclick="window.print()">下载 / 打印</button>
  </div>
</body>
</html>`;
  };

  const handleExport = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `精选合集_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    const html = generateHTML();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  if (!selectMode) {
    return null;
  }

  return (
    <div className="export-bar">
      <div className="export-bar-content">
        <div className="selected-count">
          已选择 <span className="count-number">{selectedPhotoIds.length}</span> 张照片
        </div>
        <div className="export-actions">
          <button
            className="btn btn-secondary"
            onClick={clearSelection}
            disabled={selectedPhotoIds.length === 0}
          >
            取消全选
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePreview}
            disabled={selectedPhotoIds.length === 0}
          >
            预览合集
          </button>
          <button
            className="btn btn-success"
            onClick={handleExport}
            disabled={selectedPhotoIds.length === 0}
          >
            导出合集
          </button>
          <button className="btn btn-close" onClick={toggleSelectMode}>
            退出勾选
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportBar;
