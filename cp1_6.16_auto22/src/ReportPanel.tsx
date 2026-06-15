import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  IssueType,
  UploadedImage,
  RectangleAnnotation,
  TroubleTicket,
} from './types';
import { useAppContext } from './AppContext';
import { formatTimestamp } from './dataProcessor';

const ISSUE_TYPES: IssueType[] = ['延误', '破损', '丢失', '其他'];
const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 500;

interface ImageEditorProps {
  image: UploadedImage;
  onUpdateAnnotations: (imageId: string, annotations: RectangleAnnotation[]) => void;
  onRemove: (imageId: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
  image,
  onUpdateAnnotations,
  onRemove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<RectangleAnnotation | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [imageLoaded, setImageLoaded] = useState<HTMLImageElement | null>(null);
  const [scaleRatio, setScaleRatio] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(img);
      const maxWidth = 340;
      const ratio = maxWidth / img.width;
      const displayHeight = Math.min(img.height * ratio, 280);
      const finalRatio = displayHeight / (img.height * ratio) * ratio;
      setCanvasSize({
        w: img.width * finalRatio,
        h: displayHeight,
      });
      setScaleRatio(finalRatio);
    };
    img.src = image.dataUrl;
  }, [image.dataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageLoaded, 0, 0, canvas.width, canvas.height);

    const allRects = [...image.annotations];
    if (currentRect) {
      allRects.push(currentRect);
    }

    allRects.forEach((rect) => {
      ctx.strokeStyle = '#ff000080';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        rect.x * scaleRatio,
        rect.y * scaleRatio,
        rect.width * scaleRatio,
        rect.height * scaleRatio
      );
      ctx.fillStyle = '#ff000020';
      ctx.fillRect(
        rect.x * scaleRatio,
        rect.y * scaleRatio,
        rect.width * scaleRatio,
        rect.height * scaleRatio
      );
    });
  }, [imageLoaded, canvasSize, image.annotations, currentRect, scaleRatio]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: canvasX / scaleRatio,
      y: canvasY / scaleRatio,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentRect({
      id: uuidv4(),
      imageId: image.id,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasCoords(e);
    setCurrentRect({
      id: 'temp',
      imageId: image.id,
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);
    setStartPos(null);

    if (currentRect.width > 10 && currentRect.height > 10) {
      const newAnnotation: RectangleAnnotation = {
        ...currentRect,
        id: uuidv4(),
      };
      onUpdateAnnotations(image.id, [...image.annotations, newAnnotation]);
    }
    setCurrentRect(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCanvasCoords(e);
    const annotations = [...image.annotations];

    for (let i = annotations.length - 1; i >= 0; i--) {
      const rect = annotations[i];
      if (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
      ) {
        annotations.splice(i, 1);
        onUpdateAnnotations(image.id, annotations);
        return;
      }
    }
  };

  return (
    <div className="image-editor" ref={containerRef}>
      <div className="image-editor-header">
        <span className="image-editor-title">截图 {image.annotations.length > 0 ? `(${image.annotations.length}处标注)` : ''}</span>
        <button
          type="button"
          className="image-remove-btn"
          onClick={() => onRemove(image.id)}
          title="删除图片"
        >
          ✕
        </button>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="annotation-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <div className="image-editor-hint">
        提示：拖拽绘制红色矩形标注，双击矩形可删除
      </div>
    </div>
  );
};

export const ReportPanel: React.FC = () => {
  const { state, submitTicket, toggleReportPanel } = useAppContext();
  const { showReportPanel, currentPackage } = state;

  const [issueType, setIssueType] = useState<IssueType>('延误');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showReportPanel) {
      setIssueType('延误');
      setDescription('');
      setImages([]);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [showReportPanel]);

  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 120;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: UploadedImage[] = [];
    let errorMsg = '';

    for (const file of Array.from(files)) {
      if (images.length + newImages.length >= MAX_IMAGES) {
        errorMsg = `最多只能上传${MAX_IMAGES}张图片`;
        break;
      }

      if (!file.type.startsWith('image/')) {
        errorMsg = '只能上传图片文件';
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        errorMsg = `图片大小不能超过5MB（${file.name}）`;
        continue;
      }

      try {
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const [dataUrl, thumbnailUrl] = await Promise.all([
          dataUrlPromise,
          generateThumbnail(file),
        ]);

        newImages.push({
          id: uuidv4(),
          file,
          dataUrl,
          thumbnailUrl,
          annotations: [],
        });
      } catch {
        errorMsg = '图片处理失败';
      }
    }

    if (newImages.length > 0) {
      setImages([...images, ...newImages]);
    }

    if (errorMsg) {
      setErrors({ ...errors, images: errorMsg });
      setTimeout(() => {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.images;
          return next;
        });
      }, 3000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const handleUpdateAnnotations = (imageId: string, annotations: RectangleAnnotation[]) => {
    setImages(
      images.map((img) =>
        img.id === imageId ? { ...img, annotations } : img
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!issueType) {
      newErrors.issueType = '请选择问题类型';
    }

    if (!description.trim()) {
      newErrors.description = '请填写问题描述';
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `问题描述不能超过${MAX_DESCRIPTION_LENGTH}字`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !currentPackage) return;

    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const ticket: TroubleTicket = {
      id: uuidv4(),
      trackingNumber: currentPackage.trackingNumber,
      issueType,
      description: description.trim(),
      images,
      status: '待处理',
      createdAt: Date.now(),
    };

    submitTicket(ticket);
    setIsSubmitting(false);
  };

  const pendingCount = state.troubleTickets.filter((t) => t.status === '待处理').length;

  return (
    <>
      {showReportPanel && (
        <div
          className="report-overlay"
          onClick={() => toggleReportPanel(false)}
        />
      )}

      <div className={`report-panel ${showReportPanel ? 'open' : ''}`}>
        <div className="report-header">
          <h3>报告问题</h3>
          <button
            type="button"
            className="close-btn"
            onClick={() => toggleReportPanel(false)}
            title="关闭"
          >
            ✕
          </button>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          {currentPackage && (
            <div className="tracking-info">
              <span className="tracking-label">运单号：</span>
              <span className="tracking-value">{currentPackage.trackingNumber}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">问题类型 *</label>
            <div className="issue-type-buttons">
              {ISSUE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`issue-type-btn ${issueType === type ? 'selected' : ''}`}
                  onClick={() => setIssueType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.issueType && (
              <div className="form-error">{errors.issueType}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              上传截图（最多{MAX_IMAGES}张，每张5MB）
            </label>
            <div className="upload-area">
              {images.map((img) => (
                <div key={img.id} className="thumbnail-item">
                  <img
                    src={img.thumbnailUrl}
                    alt="截图缩略图"
                    className="thumbnail-img"
                  />
                  {img.annotations.length > 0 && (
                    <div className="annotation-badge">
                      {img.annotations.length}
                    </div>
                  )}
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="upload-btn" title="点击上传截图">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="upload-input"
                    onChange={handleFileUpload}
                  />
                  <span className="upload-icon">+</span>
                  <span className="upload-text">上传</span>
                </label>
              )}
            </div>
            {errors.images && (
              <div className="form-error">{errors.images}</div>
            )}

            {images.length > 0 && (
              <div className="editors-container">
                {images.map((img) => (
                  <ImageEditor
                    key={img.id}
                    image={img}
                    onUpdateAnnotations={handleUpdateAnnotations}
                    onRemove={handleRemoveImage}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              问题描述 * <span className="char-count">({description.length}/{MAX_DESCRIPTION_LENGTH})</span>
            </label>
            <textarea
              className={`form-textarea ${errors.description ? 'has-error' : ''}`}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="请详细描述遇到的问题，包括时间、地点、具体情况等..."
              rows={4}
            />
            {errors.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => toggleReportPanel(false)}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交工单'}
            </button>
          </div>
        </form>

        <div className="tickets-section">
          <div className="tickets-header">
            <h4>历史工单</h4>
            {pendingCount > 0 && (
              <span className="pending-badge">
                待处理 {pendingCount}
              </span>
            )}
          </div>

          <div className="tickets-list">
            {state.troubleTickets.length === 0 ? (
              <div className="tickets-empty">暂无工单记录</div>
            ) : (
              state.troubleTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const statusColors: Record<string, string> = {
  '待处理': '#f44336',
  '处理中': '#ff9800',
  '已解决': '#4caf50',
};

const TicketCard: React.FC<{ ticket: TroubleTicket }> = ({ ticket }) => {
  const typeEmojis: Record<IssueType, string> = {
    '延误': '⏰',
    '破损': '📦',
    '丢失': '🔍',
    '其他': '📋',
  };

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <div className="ticket-type">
          <span className="ticket-emoji">{typeEmojis[ticket.issueType]}</span>
          <span>{ticket.issueType}</span>
        </div>
        <span
          className="ticket-status"
          style={{
            backgroundColor: statusColors[ticket.status] + '20',
            color: statusColors[ticket.status],
          }}
        >
          {ticket.status}
        </span>
      </div>
      <div className="ticket-description">{ticket.description}</div>
      <div className="ticket-meta">
        <span>运单：{ticket.trackingNumber}</span>
        <span>{formatTimestamp(ticket.createdAt)}</span>
      </div>
      {ticket.images.length > 0 && (
        <div className="ticket-thumbnails">
          {ticket.images.map((img) => (
            <div key={img.id} className="ticket-thumbnail">
              <img src={img.thumbnailUrl} alt="工单截图" />
              {img.annotations.length > 0 && (
                <div className="ticket-annotation-count">
                  {img.annotations.length}处标注
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
