import React, { useEffect, useMemo, useState } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { FILTER_LIST } from '@/types'
import type { FilterType } from '@/types'
import { generateFilterThumbnail } from '@/modules/imageEngine'
import { Palette, Sliders } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection'

export const FilterPanel: React.FC = () => {
  const {
    currentFilter,
    filterIntensity,
    setFilter,
    setFilterIntensity,
    originalImage,
  } = useEditorStore()

  const [thumbs, setThumbs] = useState<Record<FilterType, string>>({} as Record<FilterType, string>)
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const generateAll = async () => {
      const result: Partial<Record<FilterType, string>> = {}
      for (const f of FILTER_LIST) {
        if (cancelled) return
        result[f.id] = await generateFilterThumbnail(originalImage, f.id, 80)
      }
      if (!cancelled) {
        setThumbs((prev) => ({ ...prev, ...(result as Record<FilterType, string>) }))
      }
    }
    generateAll()
    return () => {
      cancelled = true
    }
  }, [originalImage])

  const handleSelect = (id: FilterType) => {
    if (id !== currentFilter) {
      setFilter(id)
      setFadeKey((k) => k + 1)
    }
  }

  return (
    <CollapsibleSection
      title="艺术风格滤镜"
      panelKey="filter"
      icon={<Palette size={18} />}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {FILTER_LIST.map((f) => {
          const isActive = currentFilter === f.id
          const thumb = thumbs[f.id]
          return (
            <button
              key={f.id}
              onClick={() => handleSelect(f.id)}
              title={f.description}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: `2px solid ${isActive ? 'var(--border-gold)' : 'var(--border-color)'}`,
                background: 'var(--bg-primary)',
                transition: 'all var(--transition-slow)',
                padding: 0,
                animation: fadeKey > 0 && isActive ? 'fadeIn 0.3s ease' : undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)'
                }
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = isActive
                  ? 'var(--border-gold)'
                  : 'var(--border-color)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={f.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  draggable={false}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    background:
                      'linear-gradient(135deg, var(--accent-primary), #8b5cf6)',
                    color: 'white',
                  }}
                >
                  {f.name.slice(0, 1)}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '4px 6px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                {f.name}
              </div>
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--border-gold)',
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {currentFilter !== 'none' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} />
              滤镜强度
            </span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              {Math.round(filterIntensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(filterIntensity * 100)}
            onChange={(e) => setFilterIntensity(Number(e.target.value) / 100)}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              appearance: 'none',
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, var(--accent-primary) ${filterIntensity * 100}%, var(--border-color) ${filterIntensity * 100}%)`,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      )}
    </CollapsibleSection>
  )
}

const rangeStyle = document.createElement('style')
rangeStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #6c63ff;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.4);
    transition: transform 0.1s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(1.1);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #6c63ff;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 6px rgba(108, 99, 255, 0.4);
    transition: transform 0.1s ease;
  }
`
if (typeof document !== 'undefined' && !rangeStyleAdded) {
  document.head.appendChild(rangeStyle)
}
var rangeStyleAdded = true
