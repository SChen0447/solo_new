/**
 * 展览浏览页
 * 
 * 功能：
 * - 根据URL param获取展览数据
 * - 获取并传递已有气泡给 ExhibitionCanvas
 * - 提供 onBubbleSave 回调处理保存
 * 
 * 调用关系：
 * App.tsx → Router(/exhibition/:id) → ViewExhibition
 *   → fetchExhibitions() 查找指定展览
 *   → fetchBubbles(id) 获取气泡列表
 *   → ExhibitionCanvas(props: exhibition, initialBubbles, onBubbleSave)
 *        → 用户交互 → onBubbleSave → saveBubble() 保存 → 重新拉取气泡
 */

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExhibitionCanvas from '../components/ExhibitionCanvas';
import { fetchExhibitions, fetchBubbles } from '../api/client';
import type { Exhibition, Bubble } from '../types';
import { getThemeGradient } from '../utils/theme';
import { AppContext } from '../App';

const ViewExhibition: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useContext(AppContext);

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载展览+气泡
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const all = await fetchExhibitions();
        const found = all.find(e => e.id === id);
        if (!found) {
          showToast('error', '展览不存在');
          setTimeout(() => navigate('/'), 800);
          return;
        }
        setExhibition(found);
        const bbs = await fetchBubbles(id);
        setBubbles(bbs);
      } catch (err: any) {
        showToast('error', err.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, showToast]);

  if (loading) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', color: '#b0b0b0' }}>
        加载展览中...
      </div>
    );
  }

  if (!exhibition) {
    return null;
  }

  return (
    <div>
      {/* 展览标题栏 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(22,33,62,0.95), rgba(15,52,96,0.95)), ${getThemeGradient(exhibition.theme)}`,
        backgroundBlendMode: 'multiply',
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#ccc',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              marginRight: '16px',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            ← 返回列表
          </button>
          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#fff',
            textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
          }}>
            {exhibition.name}
          </span>
          <span style={{
            marginLeft: '16px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '13px',
          }}>
            {exhibition.images.length} 张图片 · {bubbles.length} 个记忆气泡
          </span>
        </div>
      </div>

      {/* Canvas 走廊 */}
      <ExhibitionCanvas
        exhibition={exhibition}
        initialBubbles={bubbles}
        onToast={showToast}
      />
    </div>
  );
};

export default ViewExhibition;
