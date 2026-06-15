import { useState, useRef, useCallback } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  images: UploadedImage[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (id: string) => void;
  maxImages?: number;
  disabled?: boolean;
}

const MAX_IMAGES = 20;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onUpload,
  onRemove,
  maxImages = MAX_IMAGES,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`文件 ${file.name} 格式不支持，仅支持 JPG 和 PNG`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 20MB 限制`);
        continue;
      }
      validFiles.push(file);
    }

    if (images.length + validFiles.length > maxImages) {
      alert(`最多上传 ${maxImages} 张图片`);
      return validFiles.slice(0, maxImages - images.length);
    }

    return validFiles;
  }, [images.length, maxImages]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [disabled, onUpload, validateFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;

      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
      e.target.value = '';
    },
    [disabled, onUpload, validateFiles]
  );

  const handleRemove = useCallback(
    (id: string) => {
      setRemovingIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        onRemove(id);
        setRemovingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    },
    [onRemove]
  );

  const getStatusBadge = (status: UploadedImage['status']) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">等待中</span>;
      case 'processing':
        return <span className="status-badge processing">处理中</span>;
      case 'completed':
        return <span className="status-badge completed">已完成</span>;
      case 'failed':
        return <span className="status-badge failed">失败</span>;
    }
  };

  return (
    <div className="image-uploader">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <div className="drop-zone-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>点击或拖拽图片到此处上传</p>
          <p className="hint">支持 JPG、PNG 格式，最多 {maxImages} 张，单张不超过 20MB</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="thumbnails-container">
          <div className="thumbnails-header">
            <h4>已上传 ({images.length}/{maxImages})</h4>
          </div>
          <div className="thumbnails-list">
            {images.map(img => (
              <div
                key={img.id}
                className={`thumbnail-item ${removingIds.has(img.id) ? 'removing' : ''} ${img.status === 'failed' ? 'failed' : ''}`}
              >
                <img src={img.thumbnail} alt={img.filename} className="thumbnail-image" />
                <div className="thumbnail-overlay">
                  <div className="thumbnail-info">
                    <span className="thumbnail-filename">{img.filename}</span>
                    {getStatusBadge(img.status)}
                    {img.error && <span className="thumbnail-error">{img.error}</span>}
                  </div>
                  {!disabled && (
                    <button
                      className="remove-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemove(img.id);
                      }}
                      title="移除"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
