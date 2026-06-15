import React from 'react';
import { PresetMode } from '../shared/types';

interface ModeCardProps {
  mode: PresetMode;
  active: boolean;
  onClick: () => void;
}

const modeMeta: Record<PresetMode, { icon: string; title: string; desc: string }> = {
  normal: { icon: '🏙️', title: '常规', desc: '基础默认配置' },
  morning_peak: { icon: '🌅', title: '早高峰', desc: '左下→右上 通勤' },
  weekend: { icon: '🌆', title: '周末', desc: '汇聚中心广场' },
};

export const ModeCard: React.FC<ModeCardProps> = ({ mode, active, onClick }) => {
  const meta = modeMeta[mode];
  return (
    <div
      className={`mode-card ${active ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <div className="mode-card-icon">{meta.icon}</div>
      <div className="mode-card-title">{meta.title}</div>
      <div className="mode-card-desc">{meta.desc}</div>
    </div>
  );
};
