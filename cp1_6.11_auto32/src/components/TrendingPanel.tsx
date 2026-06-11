import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { Work } from '../App';

interface Props {
  works: Work[];
  onWorkClick: (id: string) => void;
}

interface TrendingItem {
  id: string;
  title: string;
  username: string;
  likes24h: number;
  rank: number;
  prevRank: number;
}

export default function TrendingPanel({ works, onWorkClick }: Props) {
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [prevTrending, setPrevTrending] = useState<TrendingItem[]>([]);
  const [bounceIds, setBounceIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeTrending = (items: TrendingItem[]): TrendingItem[] => {
    return [...items]
      .sort((a, b) => b.likes24h - a.likes24h)
      .map((item, i) => ({
        ...item,
        prevRank: item.rank,
        rank: i + 1,
      }));
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch('/api/trending');
      if (res.ok) {
        const data = await res.json();
        setTrending((prev) => {
          const prevMap = new Map(prev.map((t) => [t.id, t.rank]));
          const newItems = data.map((item: any) => ({
            ...item,
            prevRank: prevMap.get(item.id) ?? item.rank,
          }));
          const ranked = computeTrending(newItems);

          const bounced = new Set<string>();
          for (const item of ranked) {
            if (item.prevRank > 0 && item.rank < item.prevRank) {
              bounced.add(item.id);
            }
          }
          setBounceIds(bounced);
          setTimeout(() => setBounceIds(new Set()), 600);

          return ranked;
        });
      }
    } catch {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sorted = [...works]
        .filter((w) => new Date(w.createdAt) >= twentyFourHoursAgo)
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 10);

      const items: TrendingItem[] = sorted.map((w, i) => ({
        id: w.id,
        title: w.title,
        username: w.username,
        likes24h: w.likes,
        rank: i + 1,
        prevRank: i + 1,
      }));

      setTrending((prev) => {
        const prevMap = new Map(prev.map((t) => [t.id, t.rank]));
        const ranked = items.map((item) => ({
          ...item,
          prevRank: prevMap.get(item.id) ?? item.rank,
        }));
        const bounced = new Set<string>();
        for (const item of ranked) {
          if (item.prevRank > 0 && item.rank < item.prevRank) {
            bounced.add(item.id);
          }
        }
        setBounceIds(bounced);
        setTimeout(() => setBounceIds(new Set()), 600);
        return ranked;
      });
    }
  };

  useEffect(() => {
    fetchTrending();
    intervalRef.current = setInterval(fetchTrending, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [works]);

  const maxLikes = useMemo(
    () => Math.max(1, ...trending.map((t) => t.likes24h)),
    [trending]
  );

  return (
    <div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: '#f39c12' }}>🔥</span> 实时热度排行
      </div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
        每5秒刷新 · 最近24小时
      </div>

      {trending.length === 0 && (
        <div style={{ fontSize: 13, color: '#555', textAlign: 'center', padding: 24 }}>
          暂无热度数据
        </div>
      )}

      {trending.map((item) => {
        const barWidth = (item.likes24h / maxLikes) * 100;
        const isBouncing = bounceIds.has(item.id);

        return (
          <div
            key={item.id}
            onClick={() => onWorkClick(item.id)}
            style={{
              marginBottom: 10,
              cursor: 'pointer',
              animation: isBouncing ? 'bounceUp 0.5s ease-out' : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.rank <= 3 ? '#f39c12' : '#666',
                    width: 20,
                  }}
                >
                  {item.rank}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: '#ddd',
                    fontWeight: 500,
                    maxWidth: 140,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>
                ♥ {item.likes24h}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${barWidth}%`,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, #f39c12, #8e44ad)`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes bounceUp {
          0% {
            transform: translateY(50px);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-8px);
          }
          70% {
            transform: translateY(4px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
