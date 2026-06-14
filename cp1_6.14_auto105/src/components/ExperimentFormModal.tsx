import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import type { BakingExperiment } from '../types';

interface ExperimentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<BakingExperiment, 'id' | 'createdAt'>) => Promise<void>;
  recipeId: string;
  defaultCost: number;
}

export function ExperimentFormModal({
  isOpen,
  onClose,
  onSubmit,
  recipeId,
  defaultCost
}: ExperimentFormModalProps) {
  const [bakingDate, setBakingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [actualWeight, setActualWeight] = useState<number>(500);
  const [browningScore, setBrowningScore] = useState<number>(5);
  const [riseUniformity, setRiseUniformity] = useState<number>(5);
  const [textureDescription, setTextureDescription] = useState('');
  const [costNote, setCostNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [actualCost, setActualCost] = useState<number>(defaultCost);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBakingDate(format(new Date(), 'yyyy-MM-dd'));
      setActualWeight(500);
      setBrowningScore(5);
      setRiseUniformity(5);
      setTextureDescription('');
      setCostNote('');
      setPhotos([]);
      setPhotoInput('');
      setActualCost(defaultCost);
    }
  }, [isOpen, defaultCost]);

  if (!isOpen) return null;

  const addPhoto = () => {
    if (photoInput.trim() && photos.length < 3) {
      setPhotos([...photos, photoInput.trim()]);
      setPhotoInput('');
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        recipeId,
        bakingDate,
        actualWeight,
        browningScore,
        riseUniformity,
        textureDescription: textureDescription.slice(0, 100),
        costNote: costNote.trim() || undefined,
        photos,
        actualCost
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="form-modal large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>记录烘焙实验</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>烘焙日期</label>
              <input
                type="date"
                value={bakingDate}
                onChange={e => setBakingDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
            <div className="form-group">
              <label>实际成品重量（g）</label>
              <input
                type="number"
                value={actualWeight}
                onChange={e => setActualWeight(parseFloat(e.target.value) || 0)}
                min={1}
                step={1}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>实际成本（元）</label>
              <input
                type="number"
                value={actualCost}
                onChange={e => setActualCost(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.1}
                required
              />
            </div>
            <div className="form-group">
              <label>成本备注（可选）</label>
              <input
                type="text"
                value={costNote}
                onChange={e => setCostNote(e.target.value)}
                placeholder="例如：使用进口黄油"
                maxLength={50}
              />
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>焦化度评分</label>
              <span className="slider-value">{browningScore}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={browningScore}
              onChange={e => setBrowningScore(parseInt(e.target.value))}
              className="range-slider browning"
              style={{
                background: `linear-gradient(to right, #F5DEB3 0%, #DAA520 50%, #6F4E37 100%)`
              }}
            />
            <div className="slider-labels">
              <span>浅色 1</span>
              <span>金黄 5</span>
              <span>深褐 10</span>
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>膨胀均匀度</label>
              <span className="slider-value">{riseUniformity}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={riseUniformity}
              onChange={e => setRiseUniformity(parseInt(e.target.value))}
              className="range-slider"
            />
            <div className="slider-labels">
              <span>不均匀 1</span>
              <span>中等 5</span>
              <span>完美均匀 10</span>
            </div>
          </div>

          <div className="form-group">
            <label>组织切面描述（100字以内）</label>
            <textarea
              value={textureDescription}
              onChange={e => setTextureDescription(e.target.value)}
              placeholder="描述面包/蛋糕内部组织的细密程度、孔洞大小等..."
              maxLength={100}
              rows={3}
            />
            <div className="char-counter">{textureDescription.length}/100</div>
          </div>

          <div className="form-group">
            <label>成品照片（最多3张，输入图片URL）</label>
            <div className="photo-input-row">
              <input
                type="text"
                value={photoInput}
                onChange={e => setPhotoInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
                disabled={photos.length >= 3}
              />
              <button
                type="button"
                className="btn-secondary small"
                onClick={addPhoto}
                disabled={!photoInput.trim() || photos.length >= 3}
              >
                <Plus size={14} /> 添加
              </button>
            </div>
            {photos.length > 0 && (
              <div className="photo-preview-list">
                {photos.map((url, idx) => (
                  <div key={idx} className="photo-preview-item">
                    <img src={url} alt="" loading="lazy" />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removePhoto(idx)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length === 0 && (
              <div className="photo-empty-hint">
                <ImageIcon size={16} />
                <span>暂无照片，可粘贴图片链接添加</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '保存中...' : '保存实验记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExperimentFormModal;
