import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import SkeletonCard from '@/components/SkeletonCard';
import ReservationModal from '@/modules/reservations/ReservationModal';
import type { Tool } from '@/types';

const categories = ['全部', '电动', '手动', '园林', '清洁'];

const ToolList = () => {
  const { tools, toolsLoading, fetchTools, currentUser } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTools(
      selectedCategory === '全部' ? undefined : selectedCategory,
      searchQuery || undefined
    );
  }, [fetchTools, selectedCategory, searchQuery]);

  const handleReserve = (tool: Tool) => {
    if (currentUser === '游客') {
      const name = prompt('请输入您的姓名：');
      if (name) {
        useAppStore.getState().setCurrentUser(name);
      } else {
        return;
      }
    }
    setSelectedTool(tool);
    setModalOpen(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: '可用',
      borrowed: '已借出',
      maintenance: '维护中'
    };
    return labels[status] || status;
  };

  const hasPendingReservation = (tool: Tool) => {
    return tool.reservations?.some(
      (r) => r.status === 'pending' && r.user_name === currentUser
    );
  };

  return (
    <div className="tool-list-page">
      <div className="filter-bar">
        <div className="category-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索工具..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-grid">
        {toolsLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : tools.map((tool) => (
              <div key={tool.id} className="tool-card">
                <Link to={`/tool/${tool.id}`}>
                  <div className="tool-image">
                    <img src={tool.image_url} alt={tool.name} />
                    {hasPendingReservation(tool) && (
                      <span className="reservation-tag">已预约</span>
                    )}
                  </div>
                </Link>
                <div className="tool-info">
                  <div className="tool-header">
                    <h3 className="tool-name">{tool.name}</h3>
                    <span className={`status-tag status-${tool.status}`}>
                      {getStatusLabel(tool.status)}
                    </span>
                  </div>
                  <p className="tool-desc">{tool.description}</p>
                  <div className="tool-actions">
                    <Link to={`/tool/${tool.id}`} className="detail-btn">
                      详情
                    </Link>
                    <button
                      className="reserve-btn"
                      onClick={() => handleReserve(tool)}
                      disabled={tool.status !== 'available'}
                    >
                      预约
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {modalOpen && selectedTool && (
        <ReservationModal
          tool={selectedTool}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchTools(
              selectedCategory === '全部' ? undefined : selectedCategory,
              searchQuery || undefined
            );
          }}
        />
      )}
    </div>
  );
};

export default ToolList;
