import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Tool } from '@/types';

interface ToolFormProps {
  tool: Tool | null;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ['电动', '手动', '园林', '清洁'];
const statuses = [
  { value: 'available', label: '可用' },
  { value: 'borrowed', label: '已借出' },
  { value: 'maintenance', label: '维护中' }
];

const ToolForm = ({ tool, onClose, onSuccess }: ToolFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '电动',
    description: '',
    image_url: '',
    status: 'available' as string
  });
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { addTool, updateTool, addNotification } = useAppStore();

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name,
        category: tool.category,
        description: tool.description,
        image_url: tool.image_url,
        status: tool.status
      });
      setImagePreview(tool.image_url);
    }
  }, [tool]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrors({ image_url: '图片大小不能超过2MB' });
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors({ image_url: '仅支持JPG和PNG格式' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const maxWidth = 400;
          const ratio = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * ratio;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(resizedDataUrl);
          setFormData(prev => ({ ...prev, image_url: resizedDataUrl }));
          setErrors({});
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = '工具名称不能为空';
    }
    if (!formData.category) {
      newErrors.category = '请选择类别';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      if (tool) {
        await updateTool(tool.id, formData);
        addNotification('更新成功', 'success');
      } else {
        await addTool(formData);
        addNotification('创建成功', 'success');
      }
      onSuccess();
    } catch {
      addNotification(tool ? '更新失败' : '创建失败', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tool-form-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2 className="modal-title">{tool ? '编辑工具' : '添加工具'}</h2>
        
        <form onSubmit={handleSubmit} className="tool-form">
          <div className="form-group">
            <label>工具名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`form-control ${errors.name ? 'error' : ''}`}
              placeholder="请输入工具名称"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>类别 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={`form-control ${errors.category ? 'error' : ''}`}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <span className="error-text">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="form-control"
              placeholder="请输入工具描述"
              rows={3}
            />
          </div>

          {tool && (
            <div className="form-group">
              <label>状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="form-control"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>工具图片</label>
            <div className="image-upload">
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="预览" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => {
                      setImagePreview('');
                      setFormData(prev => ({ ...prev, image_url: '' }));
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="upload-placeholder">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon">📷</div>
                  <p>点击上传图片</p>
                  <small>支持 JPG/PNG，最大 2MB</small>
                </label>
              )}
            </div>
            {errors.image_url && <span className="error-text">{errors.image_url}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? '保存中...' : (tool ? '保存修改' : '创建工具')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolForm;
