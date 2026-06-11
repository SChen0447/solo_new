import React, { useCallback, useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Search,
  StickyNote,
  ImageIcon,
  LayoutGrid,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import type { BlockType } from '../../utils/constants';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const filterType = useCanvasStore((s) => s.filterType);
  const blocks = useCanvasStore((s) => s.blocks);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);
  const setFilterType = useCanvasStore((s) => s.setFilterType);
  const exportJSON = useCanvasStore((s) => s.exportJSON);
  const clearAll = useCanvasStore((s) => s.clearAll);
  const history = useCanvasStore((s) => s.history);
  const createStickyNote = useCanvasStore((s) => s.createStickyNote);

  const stickyCount = blocks.filter((b) => b.type === 'sticky').length;
  const imageCount = blocks.filter((b) => b.type === 'image').length;

  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJSON]);

  const handleAddSticky = useCallback(() => {
    createStickyNote(
      100 + Math.random() * 300,
      100 + Math.random() * 300
    );
  }, [createStickyNote]);

  if (collapsed) {
    return (
      <div
        className="sidebar-glass"
        style={{
          width: 64,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 8,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="btn-glass"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
          title="展开侧边栏"
        >
          <ChevronRight size={18} />
        </button>

        <button
          onClick={undo}
          className="btn-glass"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: history.past.length === 0 ? 0.35 : 1,
          }}
          disabled={history.past.length === 0}
          title="撤销"
        >
          <Undo2 size={18} />
        </button>

        <button
          onClick={redo}
          className="btn-glass"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: history.future.length === 0 ? 0.35 : 1,
          }}
          disabled={history.future.length === 0}
          title="重做"
        >
          <Redo2 size={18} />
        </button>

        <button
          onClick={handleAddSticky}
          className="btn-glass"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="新建便签"
        >
          <Plus size={18} />
        </button>

        <button
          onClick={handleExport}
          className="btn-glass"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="导出"
        >
          <Download size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="sidebar-glass"
      style={{
        width: 240,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--color-deep-brown)',
            lineHeight: 1.2,
          }}
        >
          灵感画布
        </h1>
        <button
          onClick={() => setCollapsed(true)}
          className="btn-glass"
          style={{
            width: 28,
            height: 28,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="折叠侧边栏"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-soft-gray)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="search-input"
            type="text"
            placeholder="搜索内容块..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', flex: '1 1 auto', overflowY: 'auto' }}>
        <div className="sidebar-section-title">筛选</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <FilterButton
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
            icon={<LayoutGrid size={14} />}
            label="全部"
            count={blocks.length}
          />
          <FilterButton
            active={filterType === 'sticky'}
            onClick={() => setFilterType('sticky')}
            icon={<StickyNote size={14} />}
            label="便签"
            count={stickyCount}
          />
          <FilterButton
            active={filterType === 'image'}
            onClick={() => setFilterType('image')}
            icon={<ImageIcon size={14} />}
            label="图片"
            count={imageCount}
          />
        </div>

        <div className="sidebar-section-title">操作</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SidebarButton
            onClick={handleAddSticky}
            icon={<Plus size={16} />}
            label="新建便签"
            accent
          />
          <SidebarButton
            onClick={undo}
            icon={<Undo2 size={16} />}
            label="撤销"
            disabled={history.past.length === 0}
          />
          <SidebarButton
            onClick={redo}
            icon={<Redo2 size={16} />}
            label="重做"
            disabled={history.future.length === 0}
          />
          <SidebarButton
            onClick={handleExport}
            icon={<Download size={16} />}
            label="导出 JSON"
          />
          <SidebarButton
            onClick={() => {
              if (blocks.length > 0 && window.confirm('确定清空所有内容块吗？')) {
                clearAll();
              }
            }}
            icon={<Trash2 size={16} />}
            label="清空画布"
            danger
          />
        </div>

        {blocks.length > 0 && (
          <>
            <div className="sidebar-section-title" style={{ marginTop: 20 }}>
              内容块列表
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {blocks.slice(0, 30).map((block) => (
                <div
                  key={block.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--color-warm-gray)',
                    background: 'rgba(255,255,255,0.4)',
                    cursor: 'default',
                    transition: 'background 150ms',
                  }}
                >
                  {block.type === 'sticky' ? (
                    <StickyNote size={12} />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {block.type === 'sticky'
                      ? (block as { content: string }).content.replace(/<[^>]+>/g, '').slice(0, 20) || '空白便签'
                      : '图片'}
                  </span>
                </div>
              ))}
              {blocks.length > 30 && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--color-soft-gray)',
                    padding: 4,
                  }}
                >
                  还有 {blocks.length - 30} 个...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          fontSize: 11,
          color: 'var(--color-soft-gray)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
        }}
      >
        <FileText size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        数据自动保存到本地
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '8px 4px',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        background: active
          ? 'var(--color-caramel-orange)'
          : 'rgba(255,255,255,0.5)',
        color: active ? 'white' : 'var(--color-warm-gray)',
        transition: 'all 200ms var(--ease-out-cubic)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.8 }}>{count}</span>
    </button>
  );
}

function SidebarButton({
  onClick,
  icon,
  label,
  disabled,
  accent,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        border: 'none',
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: accent
          ? 'var(--color-caramel-orange)'
          : 'rgba(255,255,255,0.5)',
        color: accent
          ? 'white'
          : danger
          ? '#c53030'
          : disabled
          ? 'var(--color-soft-gray)'
          : 'var(--color-warm-gray)',
        opacity: disabled ? 0.5 : 1,
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        transition: 'all 200ms var(--ease-out-cubic)',
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = accent
            ? '#d06a4f'
            : 'rgba(255,255,255,0.8)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = accent
          ? 'var(--color-caramel-orange)'
          : 'rgba(255,255,255,0.5)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
