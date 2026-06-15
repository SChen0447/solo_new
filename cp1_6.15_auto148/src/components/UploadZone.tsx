import { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragging = useAppStore((s) => s.isDragging);
  const setDragging = useAppStore((s) => s.setDragging);
  const handleFileUpload = useAppStore((s) => s.handleFileUpload);
  const uploadedImage = useAppStore((s) => s.uploadedImage);
  const isExtracting = useAppStore((s) => s.isExtracting);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFileUpload(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) handleFileUpload(files[0]);
    e.target.value = '';
  };

  return (
    <div className="upload-zone-wrapper">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="upload-input"
          onChange={handleChange}
        />
        {uploadedImage && !isExtracting ? (
          <div className="upload-preview">
            <img src={uploadedImage} alt="uploaded preview" />
            <div className="upload-overlay">
              <ImageIcon size={20} />
              <span>点击或拖拽更换图片</span>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            {isExtracting ? (
              <>
                <div className="upload-spinner" />
                <p className="upload-text-main">正在提取色彩…</p>
                <p className="upload-text-sub">请稍候片刻</p>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <Upload size={32} />
                </div>
                <p className="upload-text-main">拖放图片到此处</p>
                <p className="upload-text-sub">或点击选择图片文件</p>
                <p className="upload-text-hint">支持 JPG / PNG / WEBP 格式</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
