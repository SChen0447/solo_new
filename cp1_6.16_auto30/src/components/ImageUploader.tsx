import React, { useCallback, useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageLoad: (imgElement: HTMLImageElement) => void;
  loading: boolean;
  previewUrl: string | null;
  extractedColors: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageLoad,
  loading,
  previewUrl,
  extractedColors,
}) => {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('仅支持 PNG/JPG 格式图片');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return false;
    }
    setError(null);
    return true;
  };

  const processFile = useCallback(
    (file: File) => {
      if (!validateFile(file)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          onImageLoad(img);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [onImageLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.dropZone,
          borderColor: dragging ? '#4caf50' : '#666',
          backgroundColor: dragging ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {loading && (
          <div style={styles.loaderWrapper}>
            <div style={styles.loader} />
            <p style={styles.loadingText}>正在提取颜色...</p>
          </div>
        )}

        {!loading && previewUrl && (
          <div style={styles.previewWrapper}>
            <img
              src={previewUrl}
              alt="预览"
              style={styles.previewImage}
            />
          </div>
        )}

        {!loading && !previewUrl && (
          <div style={styles.placeholder}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={styles.placeholderText}>拖拽或点击上传图片</p>
            <p style={styles.placeholderSubText}>支持 PNG/JPG，最大 5MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      {extractedColors.length > 0 && !loading && (
        <div style={styles.colorBar}>
          {extractedColors.map((color, i) => (
            <div
              key={i}
              style={{
                ...styles.colorBarItem,
                backgroundColor: color,
                animation: `fadeSlideIn 0.4s ${i * 0.1}s both cubic-bezier(0.34, 1.56, 0.64, 1)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dropZone: {
    border: '2px dashed #666',
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '280px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  placeholderText: {
    color: '#999',
    fontSize: '14px',
    margin: 0,
  },
  placeholderSubText: {
    color: '#666',
    fontSize: '12px',
    margin: 0,
  },
  previewWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '240px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    objectFit: 'contain',
  },
  loaderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loader: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid transparent',
    borderTopColor: '#667eea',
    borderRightColor: '#764ba2',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#888',
    fontSize: '13px',
    margin: 0,
  },
  errorText: {
    color: '#ef5350',
    fontSize: '12px',
    margin: 0,
  },
  colorBar: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
    height: '32px',
  },
  colorBarItem: {
    flex: 1,
    minWidth: 0,
  },
};

export default ImageUploader;
