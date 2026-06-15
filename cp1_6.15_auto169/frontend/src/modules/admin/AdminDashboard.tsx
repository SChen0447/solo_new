import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { adminApi, reservationApi, borrowApi } from '@/services/api';
import ToolForm from './ToolForm';
import type { Stats, Tool, Reservation, BorrowRecord } from '@/types';

type TabType = 'tools' | 'reservations' | 'stats';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tools');
  const [stats, setStats] = useState<Stats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [reservationFilter, setReservationFilter] = useState('all');
  
  const { isAdmin, tools, fetchTools, deleteTool, addNotification } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchTools();
    loadData();
  }, [isAdmin, navigate, fetchTools, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'stats') {
        const data = await adminApi.getStats();
        setStats(data);
      } else if (activeTab === 'reservations') {
        const data = await reservationApi.getAll();
        setReservations(data);
      } else if (activeTab === 'tools') {
        const records = await borrowApi.getRecords();
        setBorrowRecords(records);
      }
    } catch {
      addNotification('加载数据失败', 'error');
    }
  };

  const handleAddTool = () => {
    setEditingTool(null);
    setShowToolForm(true);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setShowToolForm(true);
  };

  const handleDeleteTool = async (id: string) => {
    if (confirm('确定要删除该工具吗？')) {
      try {
        await deleteTool(id);
        addNotification('删除成功', 'success');
      } catch {
        addNotification('删除失败', 'error');
      }
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: '可用',
      borrowed: '已借出',
      maintenance: '维护中',
      pending: '待借用',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labels[status] || status;
  };

  const getToolBorrower = (toolId: string) => {
    const record = borrowRecords.find(
      (r) => r.tool_id === toolId && r.status === 'borrowed'
    );
    return record?.user_name || '-';
  };

  const getToolReservationCount = (tool: Tool) => {
    return tool.reservations?.length || 0;
  };

  const filteredReservations = reservations.filter((r) => {
    if (reservationFilter === 'all') return true;
    return r.status === reservationFilter;
  });

  const renderToolsTab = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>工具管理</h2>
        <button className="primary-btn" onClick={handleAddTool}>
          + 添加工具
        </button>
      </div>
      
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>类别</th>
              <th>状态</th>
              <th>借用人</th>
              <th>预约数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.id}>
                <td className="id-cell">{tool.id.slice(0, 8)}...</td>
                <td>
                  <div className="tool-cell">
                    <img src={tool.image_url} alt={tool.name} />
                    <span>{tool.name}</span>
                  </div>
                </td>
                <td>{tool.category}</td>
                <td>
                  <span className={`status-tag status-${tool.status}`}>
                    {getStatusLabel(tool.status)}
                  </span>
                </td>
                <td>{getToolBorrower(tool.id)}</td>
                <td>{getToolReservationCount(tool)}</td>
                <td>
                  <button
                    className="action-btn edit"
                    onClick={() => handleEditTool(tool)}
                  >
                    编辑
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteTool(tool.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReservationsTab = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>预约记录</h2>
        <div className="filter-select">
          <select
            value={reservationFilter}
            onChange={(e) => setReservationFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="pending">待借用</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>
      
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>预约ID</th>
              <th>工具</th>
              <th>用户</th>
              <th>日期</th>
              <th>时段</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((r) => (
              <tr key={r.id}>
                <td className="id-cell">{r.id.slice(0, 8)}...</td>
                <td>{r.tool_name}</td>
                <td>{r.user_name}</td>
                <td>{r.reservation_date}</td>
                <td>{r.time_slot}</td>
                <td>
                  <span className={`status-tag status-${r.status}`}>
                    {getStatusLabel(r.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="admin-section">
      <h2>借用统计</h2>
      
      {stats && (
        <>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{stats.totalBorrows}</div>
              <div className="stat-label">总借用次数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.currentBorrows}</div>
              <div className="stat-label">当前借用数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalTools}</div>
              <div className="stat-label">工具总数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.availableTools}</div>
              <div className="stat-label">可用工具</div>
            </div>
          </div>

          <div className="stats-charts">
            <div className="chart-container">
              <h3>工具状态分布</h3>
              <div className="donut-chart">
                <svg viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="12"
                  />
                  {stats.popularTools.length > 0 && (
                    <>
                      {[
                        { value: stats.availableTools, color: '#4caf50', offset: 0 },
                        { value: stats.borrowedTools, color: '#f44336', offset: (stats.availableTools / stats.totalTools) * 251.2 },
                        { value: stats.maintenanceTools, color: '#ffc107', offset: ((stats.availableTools + stats.borrowedTools) / stats.totalTools) * 251.2 }
                      ].map((segment, i) => {
                        const circumference = 251.2;
                        const length = (segment.value / stats.totalTools) * circumference;
                        return (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="12"
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-segment.offset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                      })}
                    </>
                  )}
                </svg>
                <div className="chart-legend">
                  <div><span className="legend-color available"></span>可用 {stats.availableTools}</div>
                  <div><span className="legend-color borrowed"></span>已借出 {stats.borrowedTools}</div>
                  <div><span className="legend-color maintenance"></span>维护中 {stats.maintenanceTools}</div>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <h3>最受欢迎工具 TOP5</h3>
              <div className="popular-tools">
                {stats.popularTools.length > 0 ? (
                  stats.popularTools.map((tool, index) => (
                    <div key={tool.name} className="popular-item">
                      <span className="rank">{index + 1}</span>
                      <span className="tool-name">{tool.name}</span>
                      <span className="borrow-count">{tool.borrow_count} 次</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">暂无数据</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <h1 className="page-title">管理后台</h1>
      
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          工具管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          预约记录
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          统计概览
        </button>
      </div>

      {activeTab === 'tools' && renderToolsTab()}
      {activeTab === 'reservations' && renderReservationsTab()}
      {activeTab === 'stats' && renderStatsTab()}

      {showToolForm && (
        <ToolForm
          tool={editingTool}
          onClose={() => {
            setShowToolForm(false);
            setEditingTool(null);
          }}
          onSuccess={() => {
            setShowToolForm(false);
            setEditingTool(null);
            fetchTools();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
