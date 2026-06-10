/**
 * 展览创建页
 * 
 * 功能：
 * - 名称输入（最多20字）
 * - 情感主题选择（4种渐变配色）
 * - 图片上传：最多6张，2MB限制，XMLHttpRequest进度条
 * - 缩略图网格：拖拽排序
 * - 每张图可输入描述文字
 * 
 * 调用关系：
 * App.tsx → Router(/create) → CreateExhibition
 *   → uploadImageWithProgress (XHR进度条) → createExhibition → navigate
 * 
 * 错误反馈：
 * - 超过2MB → 按钮抖动 + 红色错误提示条
 * - 其他表单错误 → showToast error
 */

import React, { useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImageWithProgress, createExhibition } from '../api/client';
import { THEME_GRADIENTS, type EmotionTheme } from '../types';
import { getThemeGradient } from '../utils/theme';
import { AppContext } from '../App';

interface UploadedImage {
  url: string;
  filename: string;
  description: string;
  progress: number; // 0-100, 100=完成
  uploading: boolean;
}

const CreateExhibition: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useContext(AppContext);

  const [name, setName] = useState('');
  const [theme, setTheme] = useState<EmotionTheme>('nostalgia');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  // 触发按钮抖动（错误反馈）
  const triggerShake = () => {
    setShakeButton(true);
    setTimeout(() => setShakeButton(false), 400);
  };

  // ============== 图片选择和上传 ==============
  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // 重置input

    for (const file of files) {
      // 容量检查
      if (file.size > 2 * 1024 * 1024) {
        triggerShake();
        showToast('error', `图片 "${file.name}" 超过 2MB 限制`);
        continue;
      }
      if (!/jpeg|jpg|png/i.test(file.name)) {
        triggerShake();
        showToast('error', `图片 "${file.name}" 格式不支持`);
        continue;
      }
      if (images.length >= 6) {
        triggerShake();
        showToast('error', '最多上传 6 张图片');
        break;
      }

      // 加入待上传列表
      const tempId = Date.now() + Math.random();
      setImages(prev => [...prev, {
        url: '',
        filename: file.name,
        description: '',
        progress: 0,
        uploading: true,
      }]);

      const idx = images.length; // 新元素索引

      try {
        const result = await uploadImageWithProgress(file, (percent) => {
          setImages(prev => {
            const next = [...prev];
            if (next[idx]) {
              next[idx] = { ...next[idx], progress: percent };
            }
            return next;
          });
        });

        // 上传完成
        setImages(prev => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              url: result.url,
              filename: result.filename,
              progress: 100,
              uploading: false,
            };
          }
          return next;
        });
      } catch (err: any) {
        triggerShake();
        showToast('error', err.message || `上传失败: ${file.name}`);
        // 移除失败项
        setImages(prev => prev.filter((_, i) => i !== idx));
      }
    }
  };

  // ============== 拖拽排序 ==============
  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === targetIdx) return;

    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  // 删除图片
  const onRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 更新描述
  const onDescriptionChange = (index: number, value: string) => {
    setImages(prev => {
      const next = [...prev];
      next[index] = { ...next[index], description: value };
      return next;
    });
  };

  // ============== 提交 ==============
  const onSubmit = async () => {
    // 校验
    if (!name.trim()) {
      triggerShake();
      showToast('error', '请输入展览名称');
      return;
    }
    if (name.length > 20) {
      triggerShake();
      showToast('error', '展览名称最多 20 个字符');
      return;
    }
    if (images.length === 0) {
      triggerShake();
      showToast('error', '请至少上传 1 张图片');
      return;
    }
    if (images.some(img => img.uploading)) {
      triggerShake();
      showToast('error', '请等待所有图片上传完成');
      return;
    }

    setSubmitting(true);
    try {
      const exhibition = await createExhibition({
        name: name.trim(),
        theme,
        images: images.map((img, i) => ({
          url: img.url,
          description: img.description,
          position: i,
        })),
      });
      showToast('success', '展览创建成功！');
      setTimeout(() => navigate(`/exhibition/${exhibition.id}`), 500);
    } catch (err: any) {
      triggerShake();
      showToast('error', err.message || '创建展览失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ============== 渲染 ==============
  return (
    <div style={{ padding: '40px 32px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '32px', fontWeight: 700, color: '#e0e0e0', marginBottom: '32px',
      }}>
        创建新展览
      </h1>

      {/* 展览名称 */}
      <Section label="展览名称">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="输入展览名称（最多20字）"
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #3a4a6a',
            background: '#0f3460',
            color: '#e0e0e0',
          }}
        />
        <div style={{ textAlign: 'right', marginTop: '6px', color: '#b0b0b0', fontSize: '13px' }}>
          {name.length}/20
        </div>
      </Section>

      {/* 主题选择 */}
      <Section label="情感主题">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {(Object.keys(THEME_GRADIENTS) as EmotionTheme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: getThemeGradient(t),
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                border: theme === t ? '3px solid #fff' : '3px solid transparent',
                transition: 'transform 0.15s ease-out, border 0.3s ease-out',
                boxShadow: theme === t ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
              }}
            >
              {THEME_GRADIENTS[t].label}
            </button>
          ))}
        </div>
      </Section>

      {/* 图片上传 */}
      <Section label={`上传图片 (${images.length}/6)`}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={images.length >= 6}
          className={shakeButton ? 'shake' : ''}
          style={{
            width: '100%',
            padding: '24px',
            borderRadius: '10px',
            border: '2px dashed #3a4a6a',
            background: images.length >= 6 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
            color: '#b0b0b0',
            fontSize: '15px',
            cursor: images.length >= 6 ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease-out',
          }}
          onMouseEnter={(e) => {
            if (images.length < 6) {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.color = '#e0e0e0';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#3a4a6a';
            e.currentTarget.style.color = '#b0b0b0';
          }}
        >
          📁 点击上传 JPG/PNG 图片（每张不超过 2MB）
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />

        {/* 缩略图网格 */}
        {images.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginTop: '24px',
          }}>
            {images.map((img, idx) => (
              <div
                key={idx}
                draggable={!img.uploading}
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={onDrop(idx)}
                style={{
                  borderRadius: '10px',
                  background: '#0f3460',
                  padding: '10px',
                  cursor: img.uploading ? 'wait' : 'move',
                  border: '1px solid #1a3a60',
                }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  position: 'relative',
                }}>
                  {img.url ? (
                    <img src={img.url} alt="" style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '28px',
                    }}>⏳</div>
                  )}
                  {img.uploading && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0,
                      padding: '6px',
                    }}>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${img.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveImage(idx); }}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(244,67,54,0.9)',
                      color: '#fff',
                      fontSize: '14px',
                      lineHeight: '24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
                <input
                  type="text"
                  value={img.description}
                  onChange={(e) => onDescriptionChange(idx, e.target.value)}
                  placeholder="添加描述..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #2a3a5a',
                    background: '#0a2a50',
                    color: '#d4d4d4',
                    fontSize: '13px',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 提交按钮 */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '10px',
            background: '#0f3460',
            color: '#b0b0b0',
            fontSize: '16px',
            fontWeight: 600,
            border: '1px solid #2a3a5a',
          }}
        >
          取消
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className={shakeButton ? 'shake' : ''}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: '10px',
            background: getThemeGradient(theme),
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'wait' : 'pointer',
            boxShadow: `0 4px 12px ${getThemeGradient(theme).includes('667eea') ? 'rgba(102,126,234,0.4)' : 'rgba(255,154,68,0.4)'}`,
          }}
        >
          {submitting ? '提交中...' : '发布展览'}
        </button>
      </div>
    </div>
  );
};

// ============== 子组件：表单区块 ==============
const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={{
      fontSize: '16px',
      fontWeight: 600,
      color: '#e0e0e0',
      marginBottom: '14px',
    }}>
      {label}
    </h3>
    {children}
  </div>
);

export default CreateExhibition;
