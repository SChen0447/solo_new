import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLibraryStore } from '../store/useLibraryStore';
import { useCountAnimation } from '../hooks/useCountAnimation';
import type { Borrow, LibraryLocation } from '../types';

function StatCard({
  label,
  value,
  unit,
  icon,
  variant
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  variant: number;
}) {
  const animatedValue = useCountAnimation(value, 500);
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value animate-count">{animatedValue}</div>
      <div className="stat-unit">{unit}</div>
    </div>
  );
}

function HomePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const getStatistics = useLibraryStore((state) => state.getStatistics);
  const borrows = useLibraryStore((state) => state.borrows);
  const locations = useLibraryStore((state) => state.locations);
  const loading = useLibraryStore((state) => state.loading);

  const stats = getStatistics();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || locations.length === 0) return;

    const defaultLat = 39.9042;
    const defaultLng = 116.4074;

    mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapInstanceRef.current?.setView(
            [pos.coords.latitude, pos.coords.longitude],
            12
          );
        },
        () => {
          console.log('Using default location');
        },
        { timeout: 5000 }
      );
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations.length]);

  useEffect(() => {
    if (!mapInstanceRef.current || locations.length === 0) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locations.forEach((loc: LibraryLocation) => {
      const customIcon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: `<div class="custom-marker">${loc.bookCount}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(
          `
            <div class="location-popup">
              <h4>${loc.name}</h4>
              <p>📍 ${loc.address}</p>
              <p>📚 藏书量: ${loc.bookCount} 本</p>
              <a href="/books" onclick="event.preventDefault(); window.location.href='/books'">查看图书 →</a>
            </div>
          `,
          { maxWidth: 280 }
        );

      markersRef.current.push(marker);
    });
  }, [locations]);

  const sortedBorrows = [...borrows]
    .sort(
      (a, b) =>
        new Date(
          b.returnDate ? b.returnDate : b.borrowDate
        ).getTime() -
        new Date(
          a.returnDate ? a.returnDate : a.borrowDate
        ).getTime()
    )
    .slice(0, 10);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return dateStr;
  };

  return (
    <div className="home-page">
      <h2 className="page-title">🏠 概览仪表盘</h2>

      <div className="stat-grid">
        <StatCard
          label="总藏书量"
          value={stats.total}
          unit="本书籍"
          icon="📚"
          variant={1}
        />
        <StatCard
          label="在架数量"
          value={stats.available}
          unit="本可借阅"
          icon="✅"
          variant={2}
        />
        <StatCard
          label="借出数量"
          value={stats.borrowed}
          unit="本已借出"
          icon="📖"
          variant={3}
        />
        <StatCard
          label="逾期数量"
          value={stats.overdue}
          unit="本需归还"
          icon="⚠️"
          variant={4}
        />
      </div>

      <div className="home-layout">
        <div className="card">
          <h3 className="section-title">📋 借阅动态</h3>
          <div className="borrow-dynamic-list">
            {sortedBorrows.length === 0 ? (
              <div className="empty-state">
                <p>暂无借阅记录</p>
              </div>
            ) : (
              sortedBorrows.map((borrow: Borrow) => (
                <div key={borrow.id} className="borrow-dynamic-item">
                  <div
                    className={`borrow-dynamic-icon ${
                      borrow.status === 'returned' ? 'return' : 'borrow'
                    }`}
                  >
                    {borrow.status === 'returned' ? '↩️' : '📤'}
                  </div>
                  <div className="borrow-dynamic-info">
                    <p>
                      <strong>{borrow.borrowerName}</strong>{' '}
                      {borrow.status === 'returned'
                        ? `归还了《${borrow.bookTitle}》`
                        : `借阅了《${borrow.bookTitle}》`}
                      {borrow.status === 'overdue' && (
                        <span className="overdue-text">（逾期）</span>
                      )}
                    </p>
                    <div className="borrow-dynamic-time">
                      {formatDate(
                        borrow.returnDate ? borrow.returnDate : borrow.borrowDate
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">🗺️ 附近藏书点</h3>
          {loading && locations.length === 0 ? (
            <div className="empty-state">
              <p>加载地图中...</p>
            </div>
          ) : (
            <div ref={mapRef} className="map-container"></div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">⚡ 快速操作</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/books" className="btn btn-primary btn-lg">
            📚 查看所有图书
          </Link>
          <Link to="/books" className="btn btn-info btn-lg">
            ➕ 添加新书
          </Link>
          <Link to="/lending" className="btn btn-warning btn-lg">
            📋 借阅管理
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
