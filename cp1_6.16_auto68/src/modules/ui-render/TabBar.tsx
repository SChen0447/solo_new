import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { AuditSession } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';

interface TabBarProps {
  sessions: AuditSession[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  sessions,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
}) => {
  const [closingTab, setClosingTab] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    setClosingTab(tabId);
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    if (closingTab) {
      onTabClose(closingTab);
      setClosingTab(null);
    }
    setConfirmOpen(false);
  };

  const handleCancelClose = () => {
    setClosingTab(null);
    setConfirmOpen(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid var(--color-border)',
        height: '40px',
        padding: '0 4px 0 8px',
        gap: '4px',
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onTabChange(session.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              height: '36px',
              minWidth: '120px',
              maxWidth: '200px',
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: session.id === activeTabId ? 'white' : 'transparent',
              borderTop: session.id === activeTabId ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderLeft: session.id === activeTabId ? '1px solid var(--color-border)' : 'none',
              borderRight: session.id === activeTabId ? '1px solid var(--color-border)' : 'none',
              borderRadius: '4px 4px 0 0',
              marginRight: '2px',
              top: session.id === activeTabId ? '1px' : '0',
              transition: 'all 0.3s ease-out',
              gap: '8px',
            }}
            className={session.id === activeTabId ? 'tab-content-enter' : ''}
          >
            <span
              style={{
                fontSize: '13px',
                color: session.id === activeTabId ? '#333' : '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {session.title}
            </span>
            <button
              onClick={(e) => handleCloseClick(e, session.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                border: 'none',
                backgroundColor: 'transparent',
                borderRadius: '3px',
                cursor: 'pointer',
                color: '#999',
                opacity: 0,
                transition: 'all 0.2s ease-out',
                padding: 0,
              }}
              className="tab-close-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#ffebee';
                e.currentTarget.style.color = 'var(--color-critical)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#999';
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onNewTab}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          border: 'none',
          backgroundColor: 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#666',
          transition: 'all 0.3s ease-out',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.color = 'var(--color-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#666';
        }}
        title="新建审计会话"
      >
        <Plus size={16} />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="确认关闭"
        message={`确定要关闭「${sessions.find((s) => s.id === closingTab)?.title}」吗？此操作不会丢失其他会话的审计结果。`}
        confirmText="关闭"
        cancelText="取消"
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </div>
  );
};

export default TabBar;
