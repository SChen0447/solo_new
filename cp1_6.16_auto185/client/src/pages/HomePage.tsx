import React, { useState, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { SortType, FilterStatus } from '../types';
import AuctionCard from '../components/AuctionCard';
import { createItem } from '../auctionService';

export const HomePage: React.FC = () => {
  const { items, placeBid, getItemBids, sortItems, filterItems, nickname } = useAuction();

  const [name, setName] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [sortType, setSortType] = useState<SortType>('latest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [fadeKey, setFadeKey] = useState(0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    const price = parseInt(startPrice, 10);
    if (!name || name.length > 20) {
      setCreateError('物品名称最多20字');
      return;
    }
    if (isNaN(price) || !Number.isInteger(price) || price < 1 || price > 9999) {
      setCreateError('起拍价必须是1-9999之间的整数');
      return;
    }
    if (![30, 60, 120].includes(duration)) {
      setCreateError('请选择有效的拍卖时长');
      return;
    }

    try {
      setCreating(true);
      await createItem({ name, startPrice: price, duration });
      setName('');
      setStartPrice('');
      setDuration(60);
    } catch (err: any) {
      setCreateError(err.response?.data?.error || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleSortChange = (type: SortType) => {
    setSortType(type);
    setFadeKey((k) => k + 1);
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setFadeKey((k) => k + 1);
  };

  const displayedItems = useMemo(() => {
    const filtered = filterItems(items, filterStatus);
    return sortItems(filtered, sortType).slice(0, 50);
  }, [items, sortType, filterStatus, sortItems, filterItems]);

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.title}>🏷️ VirtualAuctionHouse</h1>
        <div style={styles.subtitle}>欢迎, {nickname}</div>

        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>创建拍卖</h2>
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>物品名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="最多20字"
                  maxLength={20}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>起拍价</label>
                <input
                  type="number"
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value)}
                  placeholder="1-9999"
                  min={1}
                  max={9999}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>拍卖时长</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  style={styles.select}
                >
                  <option value={30}>快速 (30秒)</option>
                  <option value={60}>标准 (60秒)</option>
                  <option value={120}>超长 (120秒)</option>
                </select>
              </div>
            </div>

            <div style={styles.formButtonRow}>
              <button type="submit" disabled={creating} style={styles.createButton}>
                {creating ? '创建中...' : '创建拍卖'}
              </button>
            </div>

            {createError && <div style={styles.formError}>{createError}</div>}
          </form>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>排序:</span>
            {(['latest', 'endingSoon', 'priceHigh'] as SortType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleSortChange(type)}
                style={{
                  ...styles.filterButton,
                  ...(sortType === type ? styles.filterButtonActive : {}),
                }}
              >
                {type === 'latest' ? '最新' : type === 'endingSoon' ? '即将结束' : '价格最高'}
              </button>
            ))}
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>状态:</span>
            {(['all', 'active', 'completed'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                style={{
                  ...styles.filterButton,
                  ...(filterStatus === status ? styles.filterButtonActive : {}),
                }}
              >
                {status === 'all' ? '全部' : status === 'active' ? '进行中' : '已成交'}
              </button>
            ))}
          </div>
        </div>

        <div key={fadeKey} style={styles.grid}>
          {displayedItems.map((item) => (
            <AuctionCard
              key={item.id}
              item={item}
              bids={getItemBids(item.id)}
              onBid={placeBid}
            />
          ))}
        </div>

        {displayedItems.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎭</div>
            <div style={styles.emptyText}>暂无拍卖物品</div>
            <div style={styles.emptySubtext}>创建第一个拍卖开始吧！</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpSummary {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    padding: '40px 8%',
    boxSizing: 'border-box',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    color: '#fff',
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: '32px',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    maxWidth: '800px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  formTitle: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: 1,
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#b0b0b0',
    fontSize: '13px',
  },
  input: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  select: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  formButtonRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  createButton: {
    width: '160px',
    height: '44px',
    backgroundColor: '#00b894',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, background-color 0.2s ease',
  },
  formError: {
    color: '#ff6b6b',
    fontSize: '13px',
    textAlign: 'center',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    color: '#b0b0b0',
    fontSize: '14px',
    marginRight: '4px',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#b0b0b0',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, color 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#00b894',
    color: '#fff',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'center',
    animation: 'fadeIn 0.5s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  emptySubtext: {
    color: '#b0b0b0',
    fontSize: '14px',
  },
};

export default HomePage;
