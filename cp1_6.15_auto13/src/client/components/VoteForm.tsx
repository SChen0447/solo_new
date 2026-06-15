import { useState } from 'react';
import { useVoteStore } from '../store/useVoteStore';

interface VoteFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function VoteForm({ onClose, onSuccess }: VoteFormProps) {
  const { createVote } = useVoteStore();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [errors, setErrors] = useState<{ title?: string; options?: string[] }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...options];
    newOptions[idx] = value;
    setOptions(newOptions);
  };

  const validate = (): boolean => {
    const newErrors: { title?: string; options?: string[] } = {};
    let valid = true;

    if (title.length < 5 || title.length > 30) {
      newErrors.title = '标题长度需在5-30个字之间';
      valid = false;
    }

    const optionErrors: string[] = [];
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o);
    if (trimmedOptions.length < 2) {
      optionErrors[0] = '至少需要2个有效选项';
      valid = false;
    }
    options.forEach((o, i) => {
      if (o.trim().length > 10) {
        optionErrors[i] = '选项长度不能超过10个字';
        valid = false;
      }
    });
    if (optionErrors.length > 0) {
      newErrors.options = optionErrors;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const validOptions = options.map((o) => o.trim()).filter((o) => o);
    const success = await createVote(title.trim(), validOptions);
    setSubmitting(false);

    if (success) {
      onSuccess();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>新建投票</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>
              投票标题 <span style={styles.required}>*</span>
              <span style={styles.hint}>({title.length}/30)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入投票标题（5-30个字）"
              style={{
                ...styles.input,
                borderColor: errors.title ? '#ef4444' : undefined,
              }}
              maxLength={30}
            />
            {errors.title && <span style={styles.errorText}>{errors.title}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              投票选项 <span style={styles.required}>*</span>
              <span style={styles.hint}>(至少2个，每个不超过10个字)</span>
            </label>
            <div style={styles.optionsList}>
              {options.map((opt, idx) => (
                <div key={idx} style={styles.optionRow}>
                  <span style={styles.optionIndex}>{idx + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`选项 ${idx + 1}`}
                    style={{
                      ...styles.input,
                      flex: 1,
                      borderColor: errors.options?.[idx] ? '#ef4444' : undefined,
                    }}
                    maxLength={10}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      style={styles.removeBtn}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {errors.options && errors.options[0] && (
                <span style={styles.errorText}>{errors.options[0]}</span>
              )}
              {options.length < 10 && (
                <button type="button" onClick={handleAddOption} style={styles.addOptionBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加选项
                </button>
              )}
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={{ ...styles.btn, ...styles.btnCancel }}>
              取消
            </button>
            <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary }} disabled={submitting}>
              {submitting ? '创建中...' : '创建投票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  field: {
    padding: '20px 24px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 400,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  optionIndex: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #7B68EE 100%)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  removeBtn: {
    background: '#fef2f2',
    border: 'none',
    color: '#ef4444',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addOptionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
    background: '#fafafa',
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #f0f0f0',
  },
  btn: {
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4A90D9 0%, #7B68EE 100%)',
    color: '#fff',
    border: 'none',
  },
  btnCancel: {
    background: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
  },
};
