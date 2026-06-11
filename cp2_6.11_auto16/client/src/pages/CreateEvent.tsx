import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addHours } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, X, Clock, Tag, FileText, Copy, Check, Calendar as CalendarIcon, Share2 } from 'lucide-react';
import type { CreateEventRequest } from '@/types';

const PRESET_TAGS = ['项目评审', '团建', '代码Review', '周会', '培训', '面试', '其他'];

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [timeSlots, setTimeSlots] = useState<{ date: string; hour: number }[]>([
    { date: format(new Date(), 'yyyy-MM-dd'), hour: 10 },
    { date: format(addHours(new Date(), 24), 'yyyy-MM-dd'), hour: 14 },
  ]);
  const [createdEvent, setCreatedEvent] = useState<{ id: string; shareUrl: string; statsUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { date: format(new Date(), 'yyyy-MM-dd'), hour: 10 }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const handleTimeSlotChange = (index: number, field: 'date' | 'hour', value: string | number) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (timeSlots.length === 0) return;

    setIsSubmitting(true);

    const candidateTimes = timeSlots.map((slot) => {
      const startTime = new Date(`${slot.date}T${String(slot.hour).padStart(2, '0')}:00:00`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      return {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    const request: CreateEventRequest = {
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      candidateTimes,
    };

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedEvent({
          id: data.id,
          shareUrl: `${window.location.origin}/vote/${data.id}`,
          statsUrl: `${window.location.origin}/stats/${data.id}`,
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdEvent) {
    return (
      <div className="main-container">
        <div
          className="card fade-in-up"
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={40} style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>创建成功！</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            您的日程投票事件已创建，请将下方链接分享给参与者
          </p>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', textAlign: 'left', marginBottom: 8, fontWeight: 500 }}>
              <Share2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              投票链接
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                value={createdEvent.shareUrl}
                readOnly
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={() => handleCopyLink(createdEvent.shareUrl)}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/vote/${createdEvent.id}`)}
            >
              预览投票页
            </button>
            <button
              className="btn btn-accent"
              onClick={() => navigate(`/stats/${createdEvent.id}`)}
            >
              查看统计看板
            </button>
          </div>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 24 }}
            onClick={() => {
              setCreatedEvent(null);
              setTitle('');
              setDescription('');
              setSelectedTags([]);
              setTimeSlots([
                { date: format(new Date(), 'yyyy-MM-dd'), hour: 10 },
                { date: format(addHours(new Date(), 24), 'yyyy-MM-dd'), hour: 14 },
              ]);
            }}
          >
            创建新事件
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 42, marginBottom: 16 }}>创建日程投票</h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            设置多个候选时间，让团队快速找到大家都有空的会议时间
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              <CalendarIcon size={18} style={{ color: 'var(--color-primary)' }} />
              事件标题 *
            </label>
            <input
              type="text"
              className="input"
              placeholder="例如：Q2 项目评审会议"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
              备注说明
            </label>
            <textarea
              className="input"
              placeholder="请输入会议描述、准备材料等信息..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              <Tag size={18} style={{ color: 'var(--color-primary)' }} />
              事件标签
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {PRESET_TAGS.map((tag) => (
                <span
                  key={tag}
                  className={`tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="自定义标签..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
              >
                <Plus size={18} />
                添加
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              <Clock size={18} style={{ color: 'var(--color-primary)' }} />
              候选时间（精确到小时）*
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="fade-in-up"
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 12,
                    animationDelay: `${index * 50}ms`,
                    opacity: 0,
                  }}
                >
                  <input
                    type="date"
                    className="input"
                    value={slot.date}
                    onChange={(e) => handleTimeSlotChange(index, 'date', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="input"
                    value={slot.hour}
                    onChange={(e) => handleTimeSlotChange(index, 'hour', parseInt(e.target.value))}
                    style={{ width: 120 }}
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => (
                      <option key={hour} value={hour}>
                        {format(new Date().setHours(hour, 0), 'HH:mm', { locale: zhCN })}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', minHeight: 40, minWidth: 40 }}
                    onClick={() => handleRemoveTimeSlot(index)}
                    disabled={timeSlots.length <= 1}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddTimeSlot}
              style={{ marginTop: 12, width: '100%' }}
            >
              <Plus size={18} />
              添加候选时间
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!title.trim() || timeSlots.length === 0 || isSubmitting}
            style={{ width: '100%', fontSize: 16, padding: '16px 32px' }}
          >
            {isSubmitting ? '创建中...' : '创建投票事件'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
