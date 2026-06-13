import React, { useCallback } from 'react';
import { getPresets } from './Store';

interface ResourcePanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  exhibitCount: number;
}

const geometryIcons: Record<string, string> = {
  veil: '∿',
  horizon: '◎',
  tower: '▤',
  bloom: '✿',
  paintingLandscape: '◧',
  paintingPortrait: '◫',
  paintingSquare: '▣',
};

const ResourcePanel: React.FC<ResourcePanelProps> = ({ collapsed, onToggleCollapse, exhibitCount }) => {
  const presets = getPresets();

  const handleDragStart = useCallback((e: React.DragEvent, presetId: string) => {
    e.dataTransfer.setData('text/preset-id', presetId);
    e.dataTransfer.effectAllowed = 'copy';
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
    el.style.transform = 'scale(0.95)';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    el.style.transform = '';
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 0,
        bottom: 72,
        width: collapsed ? 52 : 272,
        background: 'rgba(248,245,240,0.88)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        zIndex: 100,
        transition: 'width 0.35s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 24px rgba(30,25,20,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '12px 0' : '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          minHeight: 48,
        }}
      >
        {!collapsed && (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: '#2A2724',
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}>
            展品库
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
            color: '#6B6560',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,123,0.12)';
            (e.currentTarget as HTMLElement).style.color = '#D4AF7B';
            (e.currentTarget as HTMLElement).style.borderColor = '#D4AF7B';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.7)';
            (e.currentTarget as HTMLElement).style.color = '#6B6560';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.06)';
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <div style={{
          padding: '8px 12px',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <div style={{
            fontSize: 11,
            color: '#9A948E',
            marginBottom: 8,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            拖拽展品到展厅地面 · {exhibitCount} 件已放置
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {presets.map((preset, idx) => (
              <div
                key={preset.id}
                draggable
                onDragStart={e => handleDragStart(e, preset.id)}
                onDragEnd={handleDragEnd}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.05)',
                  padding: '10px 8px',
                  cursor: 'grab',
                  transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  animation: `fadeIn 0.5s ease-out ${idx * 60}ms both`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.transform = 'translateY(-3px) scale(1.04)';
                  el.style.boxShadow = '0 8px 28px rgba(30,25,20,0.1)';
                  el.style.borderColor = '#D4AF7B';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.transform = '';
                  el.style.boxShadow = '';
                  el.style.borderColor = 'rgba(0,0,0,0.05)';
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${preset.thumbnailColor || preset.color}40, ${preset.thumbnailColor || preset.color}18)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  color: preset.thumbnailColor || preset.color,
                  border: `2px solid ${preset.thumbnailColor || preset.color}30`,
                }}>
                  {geometryIcons[preset.geometry] || '?'}
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#2A2724',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  fontFamily: 'var(--font-body)',
                }}>
                  {preset.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#9A948E',
                  textAlign: 'center',
                }}>
                  {preset.theme}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {collapsed && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 8,
          gap: 6,
          overflowY: 'auto',
        }}>
          {presets.map(preset => (
            <div
              key={preset.id}
              draggable
              onDragStart={e => handleDragStart(e, preset.id)}
              onDragEnd={handleDragEnd}
              title={preset.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${preset.thumbnailColor || preset.color}35, ${preset.thumbnailColor || preset.color}15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: preset.thumbnailColor || preset.color,
                cursor: 'grab',
                border: `1px solid ${preset.thumbnailColor || preset.color}25`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
                (e.currentTarget as HTMLElement).style.borderColor = preset.thumbnailColor || preset.color;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.borderColor = `${preset.thumbnailColor || preset.color}25`;
              }}
            >
              {geometryIcons[preset.geometry] || '?'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourcePanel;
