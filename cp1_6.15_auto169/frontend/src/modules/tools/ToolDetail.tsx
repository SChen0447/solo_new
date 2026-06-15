import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { toolApi } from '@/services/api';
import ReservationModal from '@/modules/reservations/ReservationModal';
import type { Tool, TimeSlot } from '@/types';

const ToolDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [tool, setTool] = useState<Tool | null>(null);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { currentUser, addNotification } = useAppStore();

  useEffect(() => {
    if (id) {
      loadTool(id);
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedDate) {
      loadAvailability(id, selectedDate);
    }
  }, [id, selectedDate]);

  const loadTool = async (toolId: string) => {
    setLoading(true);
    try {
      const data = await toolApi.getById(toolId);
      setTool(data);
    } catch {
      addNotification('加载工具详情失败', 'error');
    }
    setLoading(false);
  };

  const loadAvailability = async (toolId: string, date: string) => {
    try {
      const data = await toolApi.getAvailability(toolId, date);
      setAvailability(data);
    } catch {
      setAvailability([]);
    }
  };

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      options.push({
        value: dateStr,
        label: i === 0 ? '今天' : i === 1 ? '明天' : date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
      });
    }
    return options;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: '可用',
      borrowed: '已借出',
      maintenance: '维护中'
    };
    return labels[status] || status;
  };

  const handleReserve = () => {
    if (currentUser === '游客') {
      const name = prompt('请输入您的姓名：');
      if (name) {
        useAppStore.getState().setCurrentUser(name);
      } else {
        return;
      }
    }
    if (tool) {
      setModalOpen(true);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!tool) {
    return <div className="not-found">工具不存在</div>;
  }

  return (
    <div className="tool-detail-page">
      <Link to="/" className="back-link">← 返回列表</Link>
      
      <div className="tool-detail">
        <div className="detail-image">
          <img src={tool.image_url} alt={tool.name} />
          {tool.qr_code_url && (
            <div className="qr-code-section">
              <p>工具二维码：</p>
              <img src={tool.qr_code_url} alt="二维码" className="qr-preview" />
            </div>
          )}
        </div>
        
        <div className="detail-info">
          <div className="detail-header">
            <h1>{tool.name}</h1>
            <span className={`status-tag status-${tool.status}`}>
              {getStatusLabel(tool.status)}
            </span>
          </div>
          
          <div className="detail-meta">
            <span className="category-badge">{tool.category}</span>
          </div>
          
          <p className="detail-desc">{tool.description}</p>
          
          <div className="reservation-section">
            <h3>预约时段</h3>
            
            <div className="date-selector">
              <label>选择日期：</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                <option value="">请选择日期</option>
                {getDateOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedDate && (
              <div className="time-slots">
                <p>可用时段：</p>
                <div className="slot-list">
                  {availability.map((slot) => (
                    <button
                      key={slot.slot}
                      className={`slot-btn ${slot.available ? '' : 'disabled'}`}
                      disabled={!slot.available}
                      onClick={() => slot.available && handleReserve()}
                    >
                      {slot.label}
                      {!slot.available && <span className="slot-status">已被预约</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button
              className="primary-btn"
              onClick={handleReserve}
              disabled={tool.status !== 'available'}
            >
              立即预约
            </button>
          </div>
        </div>
      </div>

      {modalOpen && tool && (
        <ReservationModal
          tool={tool}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            if (id) loadTool(id);
          }}
        />
      )}
    </div>
  );
};

export default ToolDetail;
