/**
 * 展览卡片组件
 * 
 * 核心功能：
 * - 300×400px 圆角卡片，主题渐变背景
 * - 毛玻璃图片效果（backdrop-filter: blur(4px)），悬停时清晰+放大1.1倍
 * - 悬停上移8px + 主题色外发光（8px扩散 0.6透明度）
 * - 点击跳转至展览浏览页
 * 
 * 数据流向：
 * ExhibitionList → map渲染 → ExhibitionCard(props: exhibition)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { Exhibition } from '../types';
import { getThemeGradient, getThemeGlowColor, formatDate } from '../utils/theme';

interface Props {
  exhibition: Exhibition;
}

const ExhibitionCard: React.FC<Props> = ({ exhibition }) => {
  const themeGradient = getThemeGradient(exhibition.theme);
  const glowColor = getThemeGlowColor(exhibition.theme);
  // 随机取一张图作为封面，若无图则null
  const coverImage = exhibition.images.length > 0
    ? exhibition.images[Math.floor(Math.random() * exhibition.images.length)]
    : null;

  return (
    <Link to={`/exhibition/${exhibition.id}`}>
      <div
        className="exhibition-card"
        style={{
          width: '300px',
          height: '400px',
          borderRadius: '12px',
          background: themeGradient,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.4), 0 0 8px 8px ${glowColor}99`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }}
      >
        {/* 展览名称 */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#fff',
          textShadow: '2px 2px 0 rgba(0,0,0,0.3)',
          marginBottom: '16px',
          minHeight: '32px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {exhibition.name}
        </h3>

        {/* 图片区域：毛玻璃 + 悬停清晰放大 */}
        <div style={{
          width: '300px',
          height: '200px',
          alignSelf: 'center',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '16px',
          flexShrink: 0,
        }}>
          {coverImage ? (
            <>
              <img
                src={coverImage.url}
                alt={coverImage.description || exhibition.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease-out, filter 0.3s ease-out',
                  // 初始：毛玻璃模糊效果
                  filter: 'blur(4px)',
                  transform: 'scale(1)',
                }}
                className="card-image"
              />
              {/* 用CSS伪元素的方式，直接给img加hover效果 */}
              <style>{`
                .exhibition-card:hover .card-image {
                  filter: blur(0) !important;
                  transform: scale(1.1) !important;
                }
              `}</style>
            </>
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)', fontSize: '40px',
            }}>
              🖼️
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div style={{
          marginTop: 'auto',
          padding: '8px 4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', color: '#b0b0b0' }}>
            {formatDate(exhibition.createdAt)}
          </span>
          <span style={{ fontSize: '14px', color: '#b0b0b0' }}>
            💬 {exhibition.bubbleCount ?? 0} 个气泡
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ExhibitionCard;
