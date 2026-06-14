import { useCallback } from 'react'
import type { IconItem } from '@/hooks/useIconLibrary'
import { useIconLibrary } from '@/hooks/useIconLibrary'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const PRESET_COLORS = [
  { label: '青', value: '#06b6d4' },
  { label: '红', value: '#ef4444' },
  { label: '橙', value: '#f97316' },
  { label: '绿', value: '#22c55e' },
  { label: '紫', value: '#8b5cf6' },
  { label: '蓝', value: '#3b82f6' },
  { label: '粉', value: '#ec4899' },
  { label: '灰', value: '#6b7280' },
  { label: '黑', value: '#000000' },
  { label: '白', value: '#ffffff' },
]

interface IconCardProps {
  icon: IconItem
}

export default function IconCard({ icon }: IconCardProps) {
  const updateIconSize = useIconLibrary((s) => s.updateIconSize)
  const updateIconColor = useIconLibrary((s) => s.updateIconColor)
  const toggleIconSelection = useIconLibrary((s) => s.toggleIconSelection)
  const removeIcon = useIconLibrary((s) => s.removeIcon)

  const handleSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateIconSize(icon.id, Number(e.target.value))
    },
    [icon.id, updateIconSize]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      updateIconColor(icon.id, color)
    },
    [icon.id, updateIconColor]
  )

  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
        updateIconColor(icon.id, val)
      }
    },
    [icon.id, updateIconColor]
  )

  const handleToggle = useCallback(() => {
    toggleIconSelection(icon.id)
  }, [icon.id, toggleIconSelection])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeIcon(icon.id)
    },
    [icon.id, removeIcon]
  )

  const displaySize = Math.min(icon.size, 128)

  return (
    <div
      className="icon-card"
      onClick={handleToggle}
      style={{
        background: '#fafafa',
        border: icon.isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease-out, transform 0.2s ease-out, box-shadow 0.2s ease-out',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        if (!icon.isSelected) el.style.borderColor = '#3b82f6'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        if (!icon.isSelected) el.style.borderColor = '#e2e8f0'
      }}
    >
      <button
        onClick={handleRemove}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: 'rgba(239,68,68,0.08)',
          border: 'none',
          borderRadius: 6,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#ef4444',
          opacity: 0.6,
          transition: 'opacity 0.15s',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0.6'
        }}
      >
        <Trash2 size={13} />
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 16px 8px',
          minHeight: 128,
        }}
      >
        <div
          style={{
            width: displaySize,
            height: displaySize,
            color: icon.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s, width 0.2s, height 0.2s',
          }}
          dangerouslySetInnerHTML={{ __html: icon.svgContent }}
        />
      </div>

      <div
        style={{
          padding: '0 12px 8px',
          textAlign: 'center',
          fontSize: 12,
          color: '#64748b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <span>{icon.name}</span>
        {icon.isSelected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>

      <div
        className="icon-edit-panel"
        style={{
          maxHeight: icon.isSelected ? 160 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out',
          borderTop: icon.isSelected ? '1px solid #e2e8f0' : '1px solid transparent',
        }}
      >
        <div style={{ padding: 12, fontSize: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>尺寸</span>
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{icon.size}px</span>
            </div>
            <input
              type="range"
              min={16}
              max={256}
              step={8}
              value={icon.size}
              onChange={handleSizeChange}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>颜色</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleColorChange(c.value)
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border:
                      icon.color === c.value
                        ? '2px solid #3b82f6'
                        : c.value === '#ffffff'
                        ? '1px solid #d1d5db'
                        : '1px solid transparent',
                    background: c.value,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>HEX</span>
              <input
                type="text"
                value={icon.color}
                onChange={handleHexInput}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 80,
                  fontSize: 12,
                  padding: '2px 6px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
