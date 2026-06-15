import React, { useEffect, useRef, memo } from 'react';
import { BattleLog, LogType } from '../engine';

interface LogPanelProps {
  logs: BattleLog[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

const LOG_COLORS: Record<LogType, string> = {
  attack: '#FF4444',
  heal: '#44AA44',
  buff: '#4488FF',
  debuff: '#FF8800',
  system: '#A0A0C0'
};

const LOG_TYPE_LABELS: Record<LogType, string> = {
  attack: '⚔ 攻击',
  heal: '✚ 治疗',
  buff: '↑ 增益',
  debuff: '↓ 减益',
  system: '● 系统'
};

const LogItem = memo(function LogItem({ log }: { log: BattleLog }) {
  const color = LOG_COLORS[log.type];
  const isSystem = log.type === 'system';
  return (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #3A3A4C',
        background: isSystem ? 'rgba(255,255,255,0.02)' : 'transparent',
        fontSize: 12,
        lineHeight: 1.5
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span
          style={{
            fontSize: 10,
            color: '#6A6A8A',
            flexShrink: 0
          }}
        >
          T{log.turn}
        </span>
        <span
          style={{
            fontSize: 10,
            color,
            padding: '1px 6px',
            background: `${color}22`,
            borderRadius: 3,
            flexShrink: 0,
            fontWeight: 600,
            border: `1px solid ${color}33`
          }}
        >
          {LOG_TYPE_LABELS[log.type]}
        </span>
        <span
          style={{
            fontSize: 11,
            color: '#C0C0D0',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {log.actorName}
        </span>
      </div>
      <div
        style={{
          paddingLeft: 26,
          color: color,
          fontSize: 11,
          wordBreak: 'break-word'
        }}
      >
        {log.message}
        {log.value !== undefined && log.type !== 'system' && log.type !== 'buff' && log.type !== 'debuff' && (
          <span
            style={{
              display: 'inline-block',
              marginLeft: 6,
              padding: '0 5px',
              background: `${color}22`,
              color,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: 10
            }}
          >
            {log.type === 'heal' ? '+' : '-'}{log.value}
          </span>
        )}
      </div>
    </div>
  );
});

const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  collapsed,
  onToggleCollapse,
  isMobile
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const attackCount = logs.filter((l) => l.type === 'attack').length;
  const healCount = logs.filter((l) => l.type === 'heal').length;

  return (
    <div
      className={`log-panel ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: isMobile ? '300px' : collapsed ? 0 : '300px',
        flexShrink: 0,
        height: '100%',
        background: '#1A1A2A',
        borderLeft: '1px solid #3A3A4C',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        position: isMobile ? 'fixed' : 'relative',
        right: 0,
        top: 0,
        zIndex: 50
      }}
    >
      <div
        style={{
          width: 300,
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid #3A3A4C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>
              📜 战斗日志
            </div>
            <div style={{ fontSize: 10, color: '#6A6A8A', marginTop: 2 }}>
              <span style={{ color: '#FF6666' }}>⚔ {attackCount}</span>
              {'  ·  '}
              <span style={{ color: '#44CC66' }}>✚ {healCount}</span>
              {'  ·  共 '}
              {logs.length} 条
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: '1px solid #3A3A4C',
              color: '#8A8AAA',
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {collapsed ? '‹' : '收起 ›'}
          </button>
        </div>

        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid #3A3A4C',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            flexShrink: 0,
            background: 'rgba(0,0,0,0.2)'
          }}
        >
          {(Object.keys(LOG_COLORS) as LogType[]).map((t) => (
            <span
              key={t}
              style={{
                fontSize: 9,
                color: LOG_COLORS[t],
                padding: '2px 6px',
                background: `${LOG_COLORS[t]}15`,
                borderRadius: 3,
                border: `1px solid ${LOG_COLORS[t]}30`
              }}
            >
              {LOG_TYPE_LABELS[t]}
            </span>
          ))}
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {logs.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#5A5A7A',
                fontSize: 12
              }}
            >
              点击「开始模拟」查看战斗日志
              <div style={{ marginTop: 20, fontSize: 30, opacity: 0.3 }}>⚔</div>
            </div>
          ) : (
            logs.map((l) => <LogItem key={l.id} log={l} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default LogPanel;
