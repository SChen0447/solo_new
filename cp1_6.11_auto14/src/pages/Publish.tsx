import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, Plus, X, ChefHat, Image } from 'lucide-react';

const TASTE_TAGS = ['酸甜', '麻辣', '清淡', '香辣', '鲜咸', '甜点'];

export default function Publish() {
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const stepImageRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [tasteTags, setTasteTags] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ description: string; image: File | null; imagePreview: string }[]>([
    { description: '', image: null, imagePreview: '' },
  ]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleTag = (tag: string) => {
    setTasteTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleStepImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSteps((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], image: file, imagePreview: URL.createObjectURL(file) };
        return updated;
      });
    }
  };

  const updateStepDescription = (index: number, description: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], description };
      return updated;
    });
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { description: '', image: null, imagePreview: '' }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('请输入菜谱标题');
      return;
    }
    if (steps.length === 0) {
      alert('请至少添加一个步骤');
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('ingredients', ingredients);
      formData.append('taste_tags', JSON.stringify(tasteTags));

      if (coverImage) {
        formData.append('cover_image', coverImage);
      }

      const stepsData = steps.map((step, index) => ({
        description: step.description,
        image: step.image ? `step_images_${index}` : '',
      }));
      formData.append('steps', JSON.stringify(stepsData));

      steps.forEach((step, index) => {
        if (step.image) {
          formData.append(`step_images_${index}`, step.image);
        }
      });

      const res = await axios.post('/api/recipes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate(`/recipe/${res.data.id || res.data._id}`);
    } catch (err) {
      alert('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <ChefHat size={28} color="#f97316" />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>发布菜谱</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>菜谱标题 *</label>
          <input
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的菜谱起个名字"
            style={{ width: '100%' }}
          />
        </div>

        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>封面图片</label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => coverInputRef.current?.click()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 8,
              padding: coverPreview ? 0 : 40,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#fafafa',
              overflow: 'hidden',
            }}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="封面预览" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
                <Upload size={32} />
                <span>点击上传封面图片</span>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>食材清单</label>
          <textarea
            className="input"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="列出所需食材，如：鸡蛋 2个、番茄 1个"
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 12 }}>口味标签</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TASTE_TAGS.map((tag) => (
              <span
                key={tag}
                className="tag"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontSize: 14,
                  backgroundColor: tasteTags.includes(tag) ? '#f97316' : '#f3f4f6',
                  color: tasteTags.includes(tag) ? '#fff' : '#374151',
                  border: 'none',
                  userSelect: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 12 }}>制作步骤 *</label>
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                marginBottom: 16,
                padding: 16,
                backgroundColor: '#fafafa',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#f97316' }}>步骤 {index + 1}</span>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <textarea
                className="input"
                value={step.description}
                onChange={(e) => updateStepDescription(index, e.target.value)}
                placeholder="描述这一步的操作"
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginBottom: 8 }}
              />
              <input
                ref={(el) => { stepImageRefs.current[index] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => handleStepImageChange(index, e)}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => stepImageRefs.current[index]?.click()}
                style={{
                  border: '1px dashed #d1d5db',
                  borderRadius: 6,
                  padding: step.imagePreview ? 0 : 20,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                }}
              >
                {step.imagePreview ? (
                  <img src={step.imagePreview} alt={`步骤${index + 1}预览`} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#9ca3af', fontSize: 13 }}>
                    <Image size={16} />
                    <span>添加步骤图片</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: '1px dashed #f97316',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
              color: '#f97316',
              fontSize: 14,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Plus size={16} />
            添加步骤
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%', padding: '12px 0', fontSize: 16, marginTop: 8 }}
        >
          {submitting ? '发布中...' : '发布菜谱'}
        </button>
      </form>
    </div>
  );
}
