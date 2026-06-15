import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Work } from './types';

interface MessageFormProps {
  work: Work;
  onClose: () => void;
  onSuccess: () => void;
}

const MessageForm: React.FC<MessageFormProps> = ({ work, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    content?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = '请输入您的姓名';
    }
    if (!email.trim()) {
      newErrors.email = '请输入邮箱地址';
    } else if (!validateEmail(email)) {
      newErrors.email = '邮箱格式不正确';
    }
    if (!content.trim()) {
      newErrors.content = '请输入消息内容';
    } else if (content.length > 500) {
      newErrors.content = '消息内容不能超过500字';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await axios.post('/api/messages', {
        work_id: work.id,
        name: name.trim(),
        email: email.trim(),
        content: content.trim(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('提交失败，请稍后重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = () => {
    if (!isSubmitting && !showSuccess) {
      setIsVisible(false);
      setTimeout(onClose, 400);
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.sheet,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div style={styles.sheetHeader}>
          <h3 style={styles.sheetTitle}>
            关于《{work.title}》的咨询
          </h3>
          <button
            style={styles.closeIcon}
            onClick={handleOverlayClick}
            disabled={isSubmitting || showSuccess}
          >
            ✕
          </button>
        </div>

        {showSuccess ? (
          <div style={styles.successContainer}>
            <div style={styles.checkmarkWrapper}>
              <svg
                style={styles.checkmark}
                viewBox="0 0 52 52"
              >
                <circle
                  style={styles.checkmarkCircle}
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  style={styles.checkmarkCheck}
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
            <p style={styles.successText}>消息发送成功！</p>
            <p style={styles.successSubtext}>我们会尽快与您联系</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                姓名 <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                style={{
                  ...styles.input,
                  borderColor: errors.name ? '#ef4444' : undefined,
                }}
                placeholder="请输入您的姓名"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p style={styles.errorText}>{errors.name}</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                邮箱 <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                style={{
                  ...styles.input,
                  borderColor: errors.email ? '#ef4444' : undefined,
                }}
                placeholder="请输入您的邮箱"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p style={styles.errorText}>{errors.email}</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                消息内容 <span style={styles.required}>*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content)
                    setErrors({ ...errors, content: undefined });
                }}
                style={{
                  ...styles.textarea,
                  borderColor: errors.content ? '#ef4444' : undefined,
                }}
                placeholder="请描述您的合作需求或问题（最多500字）"
                rows={5}
                maxLength={500}
                disabled={isSubmitting}
              />
              <div style={styles.charCount}>
                {content.length}/500
              </div>
              {errors.content && (
                <p style={styles.errorText}>{errors.content}</p>
              )}
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: isSubmitting ? 0.7 : 1,
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '发送消息'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2000,
  },
  sheet: {
    width: '100%',
    maxWidth: '640px',
    backgroundColor: 'white',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
    transition: 'transform 0.4s ease-out',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px 16px',
    borderBottom: '1px solid #f3f4f6',
  },
  sheetTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a2332',
    margin: 0,
  },
  closeIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  form: {
    padding: '24px 28px 28px',
    overflowY: 'auto',
    flex: 1,
  },
  formGroup: {
    marginBottom: '20px',
    position: 'relative',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '120px',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  charCount: {
    position: 'absolute',
    right: '12px',
    bottom: '-22px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  errorText: {
    fontSize: '13px',
    color: '#ef4444',
    marginTop: '6px',
    marginBottom: 0,
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1a2332',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 28px 56px',
  },
  checkmarkWrapper: {
    width: '80px',
    height: '80px',
    marginBottom: '24px',
  },
  checkmark: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'block',
    strokeWidth: 2,
    stroke: '#10b981',
    strokeMiterlimit: 10,
    animation: 'fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both',
  },
  checkmarkCircle: {
    strokeDasharray: 166,
    strokeDashoffset: 166,
    strokeWidth: 2,
    strokeMiterlimit: 10,
    stroke: '#10b981',
    fill: 'none',
    animation: 'stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards',
  },
  checkmarkCheck: {
    transformOrigin: '50% 50%',
    strokeDasharray: 48,
    strokeDashoffset: 48,
    stroke: '#10b981',
    animation: 'stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards',
  },
  successText: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a2332',
    margin: '0 0 8px',
  },
  successSubtext: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  },
};

export default MessageForm;
