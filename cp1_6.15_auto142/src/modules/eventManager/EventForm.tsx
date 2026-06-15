import React, { useState } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

const CustomFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '字段名称不能为空'),
  type: z.enum(['text', 'select', 'multiselect', 'boolean']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const EventFormSchema = z.object({
  name: z.string().min(1, '活动名称不能为空'),
  date: z.string().min(1, '活动时间不能为空'),
  location: z.string().min(1, '活动地点不能为空'),
  maxParticipants: z.coerce.number().min(1, '最大人数必须大于0'),
  description: z.string().optional(),
  customFields: z.array(CustomFieldSchema),
});

type CustomField = {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  options?: string[];
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '24px',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  } as React.CSSProperties,
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
  } as React.CSSProperties,
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    outline: 'none',
  } as React.CSSProperties,
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  button: {
    padding: '0 24px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2196f3',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
  } as React.CSSProperties,
  secondaryButton: {
    padding: '0 16px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'white',
    color: '#555',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  customFieldSection: {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#fafafa',
    borderRadius: '8px',
  } as React.CSSProperties,
  customFieldItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #eee',
  } as React.CSSProperties,
  error: {
    color: '#f44336',
    fontSize: '12px',
    marginTop: '4px',
  } as React.CSSProperties,
  errorCard: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '12px',
  } as React.CSSProperties,
} as const;

export default function EventForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    maxParticipants: 50,
    description: '',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: '',
      type: 'text',
      required: false,
    };
    setCustomFields((prev) => [...prev, newField]);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    setCustomFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...field };
      if ((field.type === 'select' || field.type === 'multiselect') && !next[index].options) {
        next[index].options = ['选项1', '选项2'];
      }
      return next;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    setCustomFields((prev) => {
      const next = [...prev];
      const options = [...(next[fieldIndex].options || [])];
      options[optionIndex] = value;
      next[fieldIndex] = { ...next[fieldIndex], options };
      return next;
    });
  };

  const addOption = (fieldIndex: number) => {
    setCustomFields((prev) => {
      const next = [...prev];
      const options = [...(next[fieldIndex].options || []), `选项${(next[fieldIndex].options?.length || 0) + 1}`];
      next[fieldIndex] = { ...next[fieldIndex], options };
      return next;
    });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setCustomFields((prev) => {
      const next = [...prev];
      const options = (next[fieldIndex].options || []).filter((_, i) => i !== optionIndex);
      next[fieldIndex] = { ...next[fieldIndex], options };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setLoading(true);

    const data = { ...formData, customFields };
    const validated = EventFormSchema.safeParse(data);

    if (!validated.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const key = issue.path[0] as string;
        if (!newErrors[key]) {
          newErrors[key] = issue.message;
        }
      }
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建活动失败');
      }

      const event = await response.json();
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      setSubmitError(error.message || '创建活动失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>创建新活动</h1>

      {submitError && (
        <div style={styles.errorCard}>
          <span>⚠</span>
          <span>{submitError}</span>
          <button
            onClick={() => setSubmitError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c62828' }}
          >
            ✕
          </button>
        </div>
      )}

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>活动名称 *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            style={{ ...styles.input, borderColor: errors.name ? '#f44336' : undefined }}
            placeholder="请输入活动名称"
          />
          {errors.name && <span style={styles.error}>{errors.name}</span>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动时间 *</label>
          <input
            type="datetime-local"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            style={{ ...styles.input, borderColor: errors.date ? '#f44336' : undefined }}
          />
          {errors.date && <span style={styles.error}>{errors.date}</span>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动地点 *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            style={{ ...styles.input, borderColor: errors.location ? '#f44336' : undefined }}
            placeholder="请输入活动地点"
          />
          {errors.location && <span style={styles.error}>{errors.location}</span>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>最大人数 *</label>
          <input
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleInputChange}
            style={{ ...styles.input, borderColor: errors.maxParticipants ? '#f44336' : undefined }}
            min="1"
          />
          {errors.maxParticipants && <span style={styles.error}>{errors.maxParticipants}</span>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            style={styles.textarea}
            placeholder="请输入活动描述（可选）"
          />
        </div>

        <div style={styles.customFieldSection}>
          <h3 style={styles.sectionTitle}>自定义报名字段</h3>

          {customFields.map((field, index) => (
            <div key={field.id} style={styles.customFieldItem}>
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateCustomField(index, { name: e.target.value })}
                placeholder="字段名称"
                style={{ ...styles.input, flex: 1 }}
              />
              <select
                value={field.type}
                onChange={(e) =>
                  updateCustomField(index, { type: e.target.value as CustomField['type'] })
                }
                style={styles.input}
              >
                <option value="text">文本</option>
                <option value="select">单选</option>
                <option value="multiselect">多选</option>
                <option value="boolean">布尔</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                />
                必填
              </label>
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                style={{ color: '#f44336', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                删除
              </button>

              {(field.type === 'select' || field.type === 'multiselect') && (
                <div style={{ width: '100%', marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>选项：</div>
                  {field.options?.map((opt, optIndex) => (
                    <div key={optIndex} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                        style={{ ...styles.input, flex: 1, padding: '6px 8px', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index, optIndex)}
                        style={{ color: '#f44336', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    style={{ ...styles.secondaryButton, fontSize: '12px', height: '28px' }}
                  >
                    + 添加选项
                  </button>
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={addCustomField} style={styles.secondaryButton}>
            + 添加自定义字段
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#1976d2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2196f3';
          }}
          onMouseDown={(e) => {
            if (!loading) e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {loading ? '创建中...' : '创建活动'}
        </button>
      </form>
    </div>
  );
}
