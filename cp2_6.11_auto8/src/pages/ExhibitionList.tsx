/**
 * 展览列表页
 * 
 * 功能：
 * - 3列响应式网格展示展览卡片
 * - 空状态提示
 * - 调用 GET /api/exhibitions 获取列表
 * 
 * 调用关系：
 * App.tsx → Router(/) → ExhibitionList → fetchExhibitions()
 */

import React, { useEffect, useState, useContext } from 'react';
import ExhibitionCard from '../components/ExhibitionCard';
import { fetchExhibitions } from '../api/client';
import type { Exhibition } from '../types';
import { AppContext } from '../App';

const ExhibitionList: React.FC = () => {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useContext(AppContext);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchExhibitions();
        setExhibitions(data);
      } catch (err: any) {
        showToast('error', err.message || '加载展览列表失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#e0e0e0',
          marginBottom: '12px',
        }}>
          所有展览
        </h1>
        <p style={{
          color: '#b0b0b0',
          fontSize: '15px',
          marginBottom: '32px',
        }}>
          共 {exhibitions.length} 个展览，双击图片创建记忆气泡
        </p>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#b0b0b0',
          }}>
            加载中...
          </div>
        ) : exhibitions.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="exhibition-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '28px',
              justifyItems: 'center',
            }}
          >
            {exhibitions.map(exh => (
              <ExhibitionCard key={exh.id} exhibition={exh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div style={{
    marginTop: '80px',
    textAlign: 'center',
    padding: '60px 20px',
    borderRadius: '12px',
    background: 'rgba(15, 52, 96, 0.3)',
  }}>
    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎨</div>
    <h2 style={{
      color: '#e0e0e0',
      fontSize: '24px',
      marginBottom: '12px',
    }}>
      还没有展览
    </h2>
    <p style={{ color: '#b0b0b0', marginBottom: '24px' }}>
      点击右上角「创建展览」开始你的第一个记忆走廊
    </p>
  </div>
);

export default ExhibitionList;
