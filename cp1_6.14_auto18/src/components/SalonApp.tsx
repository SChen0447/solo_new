import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ServiceType, AppointmentStatus } from '../types';
import { useSalonStore } from '../store/useSalonStore';
import AppointmentCard from './AppointmentCard';
import './SalonApp.css';

const services: (ServiceType | 'all')[] = ['all', '剪发', '染发', '护理', '造型'];
const statuses: (AppointmentStatus | 'all')[] = ['all', 'pending', 'completed', 'cancelled'];

const serviceLabels: Record<string, string> = {
  all: '全部服务',
  剪发: '剪发',
  染发: '染发',
  护理: '护理',
  造型: '造型'
};

const statusLabels: Record<string, string> = {
  all: '全部状态',
  pending: '待服务',
  completed: '已完成',
  cancelled: '已取消'
};

function SalonApp() {
  const {
    getSortedAppointments,
    setFilters,
    filters,
    loadMore,
    visibleCount,
    loading
  } = useSalonStore();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sortedAppointments = useMemo(() => {
    const start = performance.now();
    const result = getSortedAppointments();
    const end = performance.now();
    if (end - start > 200) {
      console.warn(`筛选耗时: ${(end - start).toFixed(2)}ms，超过200ms阈值`);
    }
    return result;
  }, [getSortedAppointments]);

  const visibleAppointments = useMemo(() => {
    return sortedAppointments.slice(0, visibleCount);
  }, [sortedAppointments, visibleCount]);

  const hasMore = visibleCount < sortedAppointments.length;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  }, [setFilters]);

  const handleServiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ service: e.target.value as ServiceType | 'all' });
  }, [setFilters]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ status: e.target.value as AppointmentStatus | 'all' });
  }, [setFilters]);

  const handleScroll = useCallback(() => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (hasMore && !loading) {
        loadMore();
      }
    }
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="salon-app">
      <div className="app-header">
        <div className="header-top">
          <h1>预约列表</h1>
          <Link to="/appointments/add" className="add-btn">
            <span className="add-icon">+</span>
            添加预约
          </Link>
        </div>

        <button
          className={`mobile-filter-btn ${mobileFiltersOpen ? 'active' : ''}`}
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          <span>☰</span> 筛选
        </button>

        <div className={`filters-bar ${mobileFiltersOpen ? 'mobile-open' : ''}`}>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索客户姓名..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-selects">
            <select
              value={filters.service}
              onChange={handleServiceChange}
              className="filter-select"
            >
              {services.map((service) => (
                <option key={service} value={service}>
                  {serviceLabels[service]}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={handleStatusChange}
              className="filter-select"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="results-count">
          共 {sortedAppointments.length} 条记录
          {sortedAppointments.length > 20 && ` (显示 ${visibleAppointments.length} 条)`}
        </div>
      </div>

      <div className="appointments-list">
        {visibleAppointments.length > 0 ? (
          visibleAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>暂无预约记录</h3>
            <p>
              {filters.search || filters.service !== 'all' || filters.status !== 'all'
                ? '没有找到符合条件的预约，请尝试调整筛选条件'
                : '点击"添加预约"开始创建第一个预约'}
            </p>
            {!filters.search && filters.service === 'all' && filters.status === 'all' && (
              <Link to="/appointments/add" className="empty-add-btn">
                添加预约
              </Link>
            )}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="load-more-container">
          <button
            className="load-more-btn"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? '加载中...' : `加载更多 (${sortedAppointments.length - visibleCount} 条)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default SalonApp;
