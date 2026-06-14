import React, { useState } from 'react'
import { useGeoStore } from '../../store'
import { ANNOTATION_COLORS } from '../../types'

export const AnnotationPanel: React.FC = () => {
  const layers = useGeoStore((s) => s.layers)
  const selectedLayerId = useGeoStore((s) => s.selectedLayerId)
  const annotations = useGeoStore((s) => s.annotations)
  const addAnnotation = useGeoStore((s) => s.addAnnotation)
  const removeAnnotation = useGeoStore((s) => s.removeAnnotation)

  const [text, setText] = useState('')
  const [color, setColor] = useState(ANNOTATION_COLORS[0].value)
  const [importance, setImportance] = useState<1 | 2 | 3>(1)

  const selectedLayer = layers.find((l) => l.id === selectedLayerId)

  const layerAnnotations = annotations
    .filter((a) => a.layerId === selectedLayerId)
    .sort((a, b) => b.createdAt - a.createdAt)

  const allAnnotations = [...annotations].sort((a, b) => b.createdAt - a.createdAt)

  const handleSubmit = () => {
    if (!selectedLayerId || !text.trim()) return
    const layer = layers.find((l) => l.id === selectedLayerId)
    if (!layer) return
    const yOffset = layer.yPosition + layer.thickness / 2
    const randomX = (Math.random() - 0.5) * 3
    const randomZ = (Math.random() - 0.5) * 3

    addAnnotation({
      layerId: selectedLayerId,
      text: text.trim().slice(0, 100),
      color,
      importance,
      position: [randomX, yOffset, randomZ],
    })
    setText('')
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-geo-text mb-1">地层信息</h2>
        {selectedLayer ? (
          <div className="geo-card p-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedLayer.color }}
              />
              <span className="text-geo-text font-medium">{selectedLayer.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-sm text-geo-text/70">
              <span>厚度: {selectedLayer.thickness} 单位</span>
              <span>岩性: {selectedLayer.lithology}</span>
              <span>年代: {selectedLayer.era}</span>
              <span>ID: {selectedLayer.id}</span>
            </div>
          </div>
        ) : (
          <p className="text-geo-text/50 text-sm">点击3D场景中的地层以查看详情</p>
        )}
      </div>

      {selectedLayerId && (
        <div className="p-4 border-b border-white/10 animate-fade-in">
          <h3 className="text-sm font-semibold text-geo-text mb-2">添加注释</h3>
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-geo-text text-sm resize-none focus:outline-none focus:border-geo-accent/50 transition-colors"
            rows={2}
            maxLength={100}
            placeholder="输入注释内容（最多100字）"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-geo-text/50">
            <span>{text.length}/100</span>
          </div>

          <div className="mt-3">
            <label className="text-xs text-geo-text/70 block mb-1">标记颜色</label>
            <div className="flex gap-1.5 flex-wrap">
              {ANNOTATION_COLORS.map((c) => (
                <button
                  key={c.value}
                  className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? '#fff' : 'transparent',
                  }}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-geo-text/70 block mb-1">重要性</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((level) => (
                <button
                  key={level}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    importance === level
                      ? 'bg-geo-accent text-geo-bg'
                      : 'bg-white/5 text-geo-text/70 hover:bg-white/10'
                  }`}
                  onClick={() => setImportance(level)}
                >
                  {'★'.repeat(level)}
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full mt-3 py-2 rounded-lg bg-geo-accent text-geo-bg font-medium text-sm transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!text.trim()}
          >
            提交注释
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-geo-text mb-2">
          标注列表 ({allAnnotations.length})
        </h3>
        {allAnnotations.length === 0 ? (
          <p className="text-geo-text/40 text-xs">暂无标注</p>
        ) : (
          <div className="space-y-2">
            {allAnnotations.map((ann) => {
              const layer = layers.find((l) => l.id === ann.layerId)
              return (
                <div
                  key={ann.id}
                  className="geo-card p-2.5 animate-fade-in group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ann.color }}
                      />
                      <span className="text-xs font-medium text-geo-text">
                        {layer?.name || '未知层'}
                      </span>
                      <span className="text-yellow-400 text-xs">
                        {'★'.repeat(ann.importance)}
                      </span>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs transition-opacity"
                      onClick={() => removeAnnotation(ann.id)}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-geo-text/80 mt-1 break-all">{ann.text}</p>
                  <p className="text-xs text-geo-text/40 mt-1">{formatTime(ann.createdAt)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
