import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Work, CATEGORIES, TAG_COLORS } from './types';
import MessageForm from './MessageForm';

const getRandomColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className} style={{ overflow: 'hidden' }}>
      {isVisible && (
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease, transform 0.3s ease',
          }}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};

const WorksPage: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [messageWork, setMessageWork] = useState<Work | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gridKey, setGridKey] = useState(0);

  const searchRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchRef.current) {
      window.clearTimeout(searchRef.current);
    }
    searchRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setGridKey((k) => k + 1);
    }, 300);
    return () => {
      if (searchRef.current) {
        window.clearTimeout(searchRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    setGridKey((k) => k + 1);
  }, [selectedCategory]);

  useEffect(() => {
    const fetchWorks = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<Work[]>('/api/works');
        setWorks(response.data);
      } catch (error) {
        console.error('获取作品失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorks();
  }, []);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesSearch = work.title
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || work.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [works, debouncedSearch, selectedCategory]);

  const handleCardClick = useCallback((work: Work) => {
    setSelectedWork(work);
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedWork(null);
  }, []);

  const handleConsultClick = useCallback(
    (work: Work, e: React.MouseEvent) => {
      e.stopPropagation();
      setMessageWork(work);
    },
    []
  );

  const handleMessageSuccess = useCallback(() => {
    setMessageWork(null);
  }, []);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>创意作品集</h1>
        <p style={styles.subtitle}>探索设计与艺术的无限可能</p>
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="搜索作品标题"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.categorySelect}
          >
            <option value="all">全部分类</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.contentWrapper}>
        {isLoading ? (
          <div style={styles.loading}>加载中...</div>
        ) : filteredWorks.length === 0 ? (
          <div style={styles.empty}>暂无匹配的作品</div>
        ) : (
          <div key={gridKey} style={styles.gridContainer}>
            {filteredWorks.map((work, index) => {
              const color = getRandomColor(work.id);
              return (
                <div
                  key={work.id}
                  style={{
                    ...styles.workCard,
                    animation: `fadeIn 0.3s ease forwards`,
                    animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                  }}
                  onClick={() => handleCardClick(work)}
                >
                  <div style={styles.imageWrapper}>
                    <LazyImage
                      src={work.image_url}
                      alt={work.title}
                      className="work-image"
                    />
                  </div>
                  <div style={styles.cardContent}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{work.title}</h3>
                      <span
                        style={{
                          ...styles.categoryTag,
                          backgroundColor: color.bg,
                          color: color.text,
                        }}
                      >
                        {work.category}
                      </span>
                    </div>
                    <p style={styles.cardDescription}>
                      {work.description.length > 60
                        ? work.description.slice(0, 60) + '...'
                        : work.description}
                    </p>
                    <button
                      style={styles.consultButton}
                      onClick={(e) => handleConsultClick(work, e)}
                    >
                      咨询
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDetail && selectedWork && (
        <div style={styles.modalOverlay} onClick={handleCloseDetail}>
          <div
            style={styles.detailModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={styles.closeButton}
              onClick={handleCloseDetail}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.transform =
                  'rotate(90deg)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.transform =
                  'rotate(0deg)')
              }
            >
              ✕
            </button>
            <div style={styles.detailContent}>
              <img
                src={selectedWork.image_url}
                alt={selectedWork.title}
                style={styles.detailImage}
              />
              <div style={styles.detailInfo}>
                <div
                  style={{
                    ...styles.categoryTag,
                    backgroundColor: getRandomColor(selectedWork.id).bg,
                    color: getRandomColor(selectedWork.id).text,
                    alignSelf: 'flex-start',
                    marginBottom: '16px',
                  }}
                >
                  {selectedWork.category}
                </div>
                <h2 style={styles.detailTitle}>{selectedWork.title}</h2>
                <p style={styles.detailDescription}>
                  {selectedWork.description}
                </p>
                {selectedWork.project_url && (
                  <a
                    href={selectedWork.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.viewProjectButton}
                  >
                    查看项目 →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {messageWork && (
        <MessageForm
          work={messageWork}
          onClose={() => setMessageWork(null)}
          onSuccess={handleMessageSuccess}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .work-image:hover img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f0',
    padding: '40px 20px',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 40px',
    textAlign: 'center',
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#1a2332',
    margin: '0 0 12px',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    margin: '0 0 32px',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '14px 20px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    backgroundColor: 'white',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  categorySelect: {
    padding: '14px 20px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    minWidth: '140px',
  },
  contentWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '80px',
    fontSize: '18px',
    color: '#6b7280',
  },
  empty: {
    textAlign: 'center',
    padding: '80px',
    fontSize: '18px',
    color: '#6b7280',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '28px',
  },
  workCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    opacity: 0,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    paddingBottom: '75%',
    overflow: 'hidden',
    borderRadius: '8px',
  },
  cardContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a2332',
    margin: 0,
    flex: 1,
  },
  categoryTag: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    flexShrink: 0,
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.6,
  },
  consultButton: {
    marginTop: 'auto',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#1a2332',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  detailModal: {
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '16px',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 10,
    transition: 'transform 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    padding: '0',
  },
  detailImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'cover',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
  },
  detailInfo: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
  },
  detailTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a2332',
    margin: '0 0 16px',
  },
  detailDescription: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.8,
    margin: '0 0 24px',
  },
  viewProjectButton: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: '#1a2332',
    color: 'white',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    alignSelf: 'flex-start',
    transition: 'all 0.3s ease',
  },
};

export default WorksPage;
