import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapView } from './MapView';
import { ReportPanel } from './ReportPanel';
import { useAppContext } from './AppContext';
import { formatTimestamp, getStatusColor } from './dataProcessor';
import { TrackingPoint } from './types';

export const App: React.FC = () => {
  const { state, handleSearch, toggleReportPanel } = useAppContext();
  const {
    currentPackage,
    trackingPoints,
    isSearching,
    searchError,
    notification,
    animationProgress,
  } = state;

  const [trackingInput, setTrackingInput] = useState('');
  const infoScrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const sortedPoints = useMemo(
    () => [...trackingPoints].sort((a, b) => a.timestamp - b.timestamp),
    [trackingPoints]
  );

  const visiblePoints = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    const total = sortedPoints.length;
    const count = Math.max(1, Math.ceil(total * animationProgress));
    return sortedPoints.slice(0, Math.min(count, total));
  }, [sortedPoints, animationProgress]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingInput.trim();
    if (trimmed && /^\d{12}$/.test(trimmed)) {
      handleSearch(trimmed);
    }
  };

  useEffect(() => {
    if (visiblePoints.length > 0 && infoScrollRef.current && !hasScrolled) {
      const container = infoScrollRef.current;
      const lastItem = container.querySelector('.timeline-item:last-child');
      if (lastItem) {
        lastItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (visiblePoints.length === sortedPoints.length) {
          setHasScrolled(true);
        }
      }
    }
  }, [visiblePoints.length, sortedPoints.length, hasScrolled]);

  useEffect(() => {
    setHasScrolled(false);
  }, [currentPackage?.trackingNumber]);

  const statusBadgeColor = currentPackage ? getStatusColor(currentPackage.currentStatus) : '#9e9e9e';

  return (
    <div className="app">
      {notification && (
        <div className={`notification-banner ${notification.visible ? 'show' : 'hide'}`}>
          <div className="notification-icon">🔔</div>
          <div className="notification-message">{notification.message}</div>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📦</span>
            <span className="logo-text">包迹追踪器</span>
          </div>
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="请输入12位运单号进行查询..."
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                maxLength={12}
              />
              {trackingInput && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setTrackingInput('')}
                  title="清除"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="search-btn"
              disabled={isSearching || !/^\d{12}$/.test(trackingInput.trim())}
            >
              {isSearching ? (
                <>
                  <span className="spinner"></span>
                  <span className="btn-text">查询中</span>
                </>
              ) : (
                <span className="btn-text">搜索</span>
              )}
            </button>
          </form>
          <div className="header-actions">
            {currentPackage && (
              <button
                type="button"
                className="report-btn"
                onClick={() => toggleReportPanel(true)}
              >
                <span className="report-icon">⚠️</span>
                <span className="report-text">报告问题</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <aside className="info-sidebar">
          {searchError ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">未找到包裹</div>
              <div className="empty-message">{searchError}</div>
              <div className="empty-hint">
                请检查运单号是否正确，或尝试以下示例运单号：
                <br />
                <code>123456789012</code>
                <br />
                <code>987654321098</code>
                <br />
                <code>555566667777</code>
              </div>
            </div>
          ) : !currentPackage ? (
            <div className="empty-state">
              <div className="empty-icon">📮</div>
              <div className="empty-title">开始追踪</div>
              <div className="empty-message">请输入12位运单号，开始追踪您的包裹</div>
              <div className="empty-hint">
                示例运单号：
                <br />
                <code className="sample-tracking">123456789012</code>
                <br />
                <code className="sample-tracking">987654321098</code>
                <br />
                <code className="sample-tracking">555566667777</code>
              </div>
            </div>
          ) : (
            <>
              <div className="section package-section">
                <div className="section-header">
                  <h3 className="section-title">包裹信息</h3>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: statusBadgeColor + '20',
                      color: statusBadgeColor,
                      borderColor: statusBadgeColor + '40',
                    }}
                  >
                    {currentPackage.currentStatus}
                  </span>
                </div>
                <div className="package-tracking-number">
                  运单号：<strong>{currentPackage.trackingNumber}</strong>
                </div>
                <div className="package-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">寄件人</span>
                    <span className="detail-value">{currentPackage.senderName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">收件人</span>
                    <span className="detail-value">{currentPackage.receiverName}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">发件地址</span>
                    <span className="detail-value">{currentPackage.senderAddress}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">收件地址</span>
                    <span className="detail-value">{currentPackage.receiverAddress}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">物品</span>
                    <span className="detail-value">{currentPackage.items}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">重量</span>
                    <span className="detail-value">{currentPackage.weight} kg</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">尺寸</span>
                    <span className="detail-value">{currentPackage.dimensions}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">预计送达</span>
                    <span className="detail-value highlight">
                      {formatTimestamp(currentPackage.estimatedDelivery)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="section timeline-section">
                <div className="section-header">
                  <h3 className="section-title">物流轨迹</h3>
                  <span className="timeline-count">
                    {visiblePoints.length}/{sortedPoints.length}
                  </span>
                </div>
                <div className="timeline-scroll" ref={infoScrollRef}>
                  <div className="timeline">
                    {visiblePoints.map((point: TrackingPoint, index: number) => {
                      const isLast = index === visiblePoints.length - 1;
                      const pointColor = getStatusColor(point.status);
                      return (
                        <div
                          key={point.id}
                          className={`timeline-item ${isLast ? 'active' : ''} timeline-animate`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="timeline-dot-wrapper">
                            <div
                              className={`timeline-dot ${isLast ? 'pulse-dot' : ''}`}
                              style={{ backgroundColor: pointColor }}
                            />
                            {index < visiblePoints.length - 1 && (
                              <div
                                className="timeline-line"
                                style={{ backgroundColor: pointColor }}
                              />
                            )}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-station">{point.stationName}</div>
                            <div className="timeline-time">
                              {formatTimestamp(point.timestamp)}
                            </div>
                            <div className="timeline-status-row">
                              <span
                                className="timeline-status"
                                style={{ color: pointColor }}
                              >
                                {point.status}
                              </span>
                              <span className="timeline-signature">
                                🖊 {point.ambassadorSignature}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        <section className="map-section">
          {!currentPackage && !searchError ? (
            <div className="map-empty">
              <div className="map-empty-icon">🗺️</div>
              <div className="map-empty-text">查询包裹后，地图将显示物流轨迹</div>
            </div>
          ) : searchError ? (
            <div className="map-empty">
              <div className="map-empty-icon">📍</div>
              <div className="map-empty-text">暂无位置信息</div>
            </div>
          ) : (
            <MapView />
          )}
        </section>
      </main>

      <ReportPanel />
    </div>
  );
};
