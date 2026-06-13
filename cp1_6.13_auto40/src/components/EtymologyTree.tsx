import { useState, useRef, useEffect } from 'react';
import { WordBreakdown, RootInfo } from '../data/wordData';

interface EtymologyTreeProps {
  breakdown: WordBreakdown;
  isExpanded: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  prefix: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  root: 'linear-gradient(135deg, #a855f7, #c084fc)',
  suffix: 'linear-gradient(135deg, #10b981, #34d399)',
  connector: 'linear-gradient(135deg, #6b7280, #9ca3af)',
};

const TYPE_BG_COLORS: Record<string, string> = {
  prefix: 'rgba(59, 130, 246, 0.15)',
  root: 'rgba(168, 85, 247, 0.15)',
  suffix: 'rgba(16, 185, 129, 0.15)',
  connector: 'rgba(107, 114, 128, 0.1)',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  prefix: '#60a5fa',
  root: '#c084fc',
  suffix: '#34d399',
  connector: '#9ca3af',
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  prefix: 'rgba(96, 165, 250, 0.4)',
  root: 'rgba(192, 132, 252, 0.4)',
  suffix: 'rgba(52, 211, 153, 0.4)',
  connector: 'rgba(156, 163, 175, 0.3)',
};

const TYPE_LABELS: Record<string, string> = {
  prefix: '前缀',
  root: '词根',
  suffix: '后缀',
  connector: '连接',
};

interface TooltipState {
  visible: boolean;
  info: RootInfo | null;
  x: number;
  y: number;
}

const EtymologyTree = ({ breakdown, isExpanded }: EtymologyTreeProps) => {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, info: null, x: 0, y: 0 });
  const [animatingNodes, setAnimatingNodes] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setAnimatingNodes(new Set());
      const timeoutIds: number[] = [];
      const totalDelay = 50;
      breakdown.parts.forEach((_, idx) => {
        const id = window.setTimeout(() => {
          setAnimatingNodes(prev => new Set(prev).add(idx));
        }, totalDelay + idx * (isMobile ? 90 : 120));
        timeoutIds.push(id);
      });
      return () => timeoutIds.forEach(id => clearTimeout(id));
    } else {
      setAnimatingNodes(new Set());
    }
  }, [breakdown, isExpanded, isMobile]);

  useEffect(() => {
    if (contentRef.current) {
      if (isExpanded) {
        setContentHeight(contentRef.current.scrollHeight);
      } else {
        setContentHeight(0);
      }
    }
  }, [isExpanded, breakdown, isMobile]);

  const handleNodeClick = (rootInfo: RootInfo | undefined, event: React.MouseEvent) => {
    if (!rootInfo || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const btnRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let x = btnRect.left - rect.left + btnRect.width / 2;
    let y = btnRect.bottom - rect.top + (isMobile ? 8 : 12);
    const maxX = rect.width - 16;
    if (isMobile) {
      x = Math.min(Math.max(140, x), rect.width - 140);
    } else {
      x = Math.min(Math.max(140, x), maxX - 156);
    }
    setTooltip({ visible: true, info: rootInfo, x, y });
  };

  const closeTooltip = () => setTooltip(prev => ({ ...prev, visible: false }));

  const treeParts = breakdown.parts.filter(p => p.type !== 'connector');

  const containerPadding = isMobile ? '20px 14px 18px' : '28px 24px 24px';
  const nodeSize = isMobile ? '52px' : '64px';
  const nodeRadius = isMobile ? '16px' : '20px';
  const nodeFontSize = isMobile ? '12px' : '14px';
  const gapSize = isMobile ? '16px' : '24px';

  return (
    <div
      style={{
        overflow: 'hidden',
        height: isExpanded ? (contentHeight === 'auto' ? 'auto' : contentHeight) : 0,
        maxHeight: contentHeight === 'auto' ? undefined : contentHeight === 0 ? 0 : 2000,
        transition: 'height 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        ref={contentRef}
      >
        <div
          ref={containerRef}
          onClick={closeTooltip}
          style={{
            position: 'relative',
            padding: containerPadding,
            marginTop: isMobile ? '2px' : '4px',
            borderTop: '1px solid rgba(99, 102, 241, 0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '6px' : '8px',
              marginBottom: isMobile ? '20px' : '32px',
              flexWrap: 'wrap',
            }}
          >
            {breakdown.parts.map((part, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
                <span
                  style={{
                    padding: isMobile ? '7px 11px' : '10px 16px',
                    borderRadius: isMobile ? '8px' : '10px',
                    fontSize: isMobile ? '15px' : '20px',
                    fontWeight: 700,
                    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                    letterSpacing: '0.02em',
                    background: TYPE_BG_COLORS[part.type],
                    color: TYPE_TEXT_COLORS[part.type],
                    border: `1.5px solid ${TYPE_BORDER_COLORS[part.type]}`,
                    transform: animatingNodes.has(idx) ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
                    opacity: animatingNodes.has(idx) ? 1 : 0,
                    transition: `all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                    transitionDelay: `${idx * (isMobile ? 60 : 80)}ms`,
                  }}
                >
                  {part.text}
                </span>
                {idx < breakdown.parts.length - 1 && (
                  <span style={{ color: 'rgba(165, 180, 252, 0.4)', fontSize: isMobile ? '14px' : '18px', fontWeight: 300 }}>+</span>
                )}
              </div>
            ))}
          </div>

          {!isMobile && treeParts.length > 1 && (
            <svg
              width="100%"
              height="80"
              style={{ marginBottom: '20px' }}
              viewBox={`0 0 ${Math.max(treeParts.length * 180, 400)} 80`}
              preserveAspectRatio="xMidYMid meet"
            >
              {treeParts.map((_, idx) => {
                const total = treeParts.length;
                const spacing = Math.min(180, 600 / Math.max(total, 1));
                const startX = (Math.max(treeParts.length * 180, 400) - (total - 1) * spacing) / 2;
                const x = startX + idx * spacing;
                const partIdx = breakdown.parts.indexOf(_);
                return (
                  <g key={idx}>
                    <line
                      x1={x} y1="0" x2={x} y2="30"
                      stroke="url(#treeGradient)" strokeWidth="2" strokeLinecap="round"
                      opacity={animatingNodes.has(partIdx) ? 0.8 : 0}
                      style={{ transition: `opacity 0.4s ${idx * 100 + 100}ms` }}
                    />
                    {idx < total - 1 && (
                      <line
                        x1={x} y1="30" x2={x + spacing} y2="30"
                        stroke="url(#treeGradient)" strokeWidth="2" strokeLinecap="round"
                        opacity={animatingNodes.has(partIdx) ? 0.6 : 0}
                        style={{ transition: `opacity 0.4s ${idx * 100 + 200}ms` }}
                      />
                    )}
                    <line
                      x1={x} y1="30" x2={x} y2="60"
                      stroke="url(#treeGradient)" strokeWidth="2" strokeLinecap="round"
                      opacity={animatingNodes.has(partIdx) ? 0.8 : 0}
                      style={{ transition: `opacity 0.4s ${idx * 100 + 250}ms` }}
                    />
                  </g>
                );
              })}
              <defs>
                <linearGradient id="treeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: gapSize,
              paddingBottom: isMobile ? '8px' : '0',
            }}
          >
            {breakdown.parts.map((part, idx) => (
              part.type !== 'connector' && (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isMobile ? '80px' : undefined }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(part.rootInfo, e); }}
                    disabled={!part.rootInfo}
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      borderRadius: nodeRadius,
                      border: 'none',
                      background: part.rootInfo ? TYPE_COLORS[part.type] : 'rgba(107, 114, 128, 0.3)',
                      cursor: part.rootInfo ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: part.rootInfo
                        ? `0 ${isMobile ? '4px' : '8px'} ${isMobile ? '12px' : '24px'} ${
                            part.type === 'prefix' ? 'rgba(59, 130, 246, 0.35)'
                            : part.type === 'root' ? 'rgba(168, 85, 247, 0.35)'
                            : 'rgba(16, 185, 129, 0.35)'
                          }`
                        : 'none',
                      transform: animatingNodes.has(idx) ? 'translateY(0) scale(1)' : `translateY(${isMobile ? '10px' : '16px'}) scale(0.8)`,
                      opacity: animatingNodes.has(idx) ? 1 : 0,
                      transition: `all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                      transitionDelay: `${idx * 100 + 200}ms`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      if (part.rootInfo && !isMobile) {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (animatingNodes.has(idx)) {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      }
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 50%)',
                      pointerEvents: 'none',
                    }} />
                    <span style={{
                      color: '#ffffff', fontSize: nodeFontSize, fontWeight: 700,
                      textShadow: '0 1px 4px rgba(0,0,0,0.2)', letterSpacing: '0.02em', zIndex: 1,
                    }}>
                      {TYPE_LABELS[part.type]}
                    </span>
                  </button>

                  <div style={{
                    marginTop: isMobile ? '8px' : '12px',
                    fontSize: isMobile ? '12px' : '13px',
                    color: '#c7d2fe', fontWeight: 500,
                    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                    transform: animatingNodes.has(idx) ? 'translateY(0)' : `translateY(${isMobile ? '6px' : '8px'})`,
                    opacity: animatingNodes.has(idx) ? 1 : 0,
                    transition: `all 0.35s ease`,
                    transitionDelay: `${idx * 100 + 350}ms`,
                    maxWidth: isMobile ? '76px' : undefined,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {part.text}
                  </div>

                  {part.rootInfo && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: isMobile ? '10px' : '11px',
                      color: '#a5b4fc',
                      opacity: animatingNodes.has(idx) ? 0.9 : 0,
                      transform: animatingNodes.has(idx) ? 'translateY(0)' : `translateY(${isMobile ? '4px' : '6px'})`,
                      transition: `all 0.35s ease`,
                      transitionDelay: `${idx * 100 + 400}ms`,
                      maxWidth: isMobile ? '80px' : '120px',
                      textAlign: 'center',
                      lineHeight: 1.35,
                    }}>
                      {part.rootInfo.meaning}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>

          <div style={{
            marginTop: isMobile ? '20px' : '32px',
            padding: isMobile ? '14px 16px' : '20px 24px',
            borderRadius: isMobile ? '12px' : '14px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            transform: animatingNodes.size === breakdown.parts.length ? 'translateY(0)' : `translateY(${isMobile ? '8px' : '12px'})`,
            opacity: animatingNodes.size === breakdown.parts.length ? 1 : 0,
            transition: 'all 0.5s ease',
            transitionDelay: isMobile ? '350ms' : '500ms',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '8px' : '10px' }}>
              <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: isMobile ? '13px' : '14px' }}>词源演化</span>
            </div>
            <p style={{
              color: '#e0e7ff',
              fontSize: isMobile ? '12.5px' : '14px',
              lineHeight: 1.75,
              margin: 0,
            }}>
              {breakdown.etymology}
            </p>
          </div>

          {tooltip.visible && tooltip.info && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: isMobile
                  ? Math.min(Math.max(12, tooltip.x - 130), (containerRef.current?.clientWidth || 300) - 274)
                  : Math.min(Math.max(tooltip.x - 140, 16), (containerRef.current?.clientWidth || 400) - 296),
                top: tooltip.y,
                width: isMobile ? '260px' : '280px',
                padding: isMobile ? '14px 16px' : '18px 20px',
                borderRadius: isMobile ? '14px' : '16px',
                background: 'rgba(30, 41, 59, 0.78)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                zIndex: 100,
                animation: 'tooltipIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '10px' : '14px' }}>
                <div>
                  <div style={{
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                    letterSpacing: '0.02em',
                  }}>
                    {tooltip.info.root}
                  </div>
                  <div style={{
                    marginTop: '4px',
                    fontSize: isMobile ? '10px' : '11px',
                    padding: '3px 10px',
                    display: 'inline-block',
                    borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#c4b5fd',
                    fontWeight: 500,
                  }}>
                    {tooltip.info.originLanguage}
                  </div>
                </div>
                <button
                  onClick={closeTooltip}
                  style={{
                    width: isMobile ? '26px' : '28px',
                    height: isMobile ? '26px' : '28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(148, 163, 184, 0.15)',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.color = '#fca5a5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <svg width={isMobile ? 12 : 14} height={isMobile ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                <div style={{
                  fontSize: isMobile ? '10px' : '11px',
                  color: '#94a3b8',
                  fontWeight: 500,
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  含义
                </div>
                <div style={{
                  fontSize: isMobile ? '14px' : '15px',
                  color: '#f1f5f9',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}>
                  {tooltip.info.meaning}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: isMobile ? '10px' : '11px',
                  color: '#94a3b8',
                  fontWeight: 500,
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  原始形式
                </div>
                <div style={{
                  fontSize: isMobile ? '12.5px' : '14px',
                  color: '#cbd5e1',
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                  fontStyle: 'italic',
                }}>
                  {tooltip.info.origin}
                </div>
              </div>
            </div>
          )}

          <style>{`
            @keyframes tooltipIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default EtymologyTree;
