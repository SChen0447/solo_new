import React, { useState } from 'react'

interface Props {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  panelKey: string
  children: React.ReactNode
}

import { useEditorStore } from '@/store/useEditorStore'
import { ChevronDown, ChevronUp } from 'lucide-react'

export const CollapsibleSection: React.FC<Props> = ({
  title,
  icon,
  panelKey,
  children,
}) => {
  const { collapsedPanels, togglePanel } = useEditorStore()
  const collapsed = collapsedPanels[panelKey] ?? false
  const [height, setHeight] = useState<number | 'auto'>('auto')

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => togglePanel(panelKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          transition: 'background var(--transition-normal)',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'var(--bg-card-hover)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'transparent')
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {icon && <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>}
          {title}
        </div>
        <span
          style={{
            color: 'var(--text-muted)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform var(--transition-slow)',
            display: 'flex',
          }}
        >
          <ChevronDown size={18} />
        </span>
      </button>
      <div
        style={{
          maxHeight: collapsed ? '0px' : '2000px',
          overflow: 'hidden',
          transition: 'max-height var(--transition-slow)',
        }}
      >
        <div style={{ padding: '4px 16px 16px' }}>{children}</div>
      </div>
    </div>
  )
}
