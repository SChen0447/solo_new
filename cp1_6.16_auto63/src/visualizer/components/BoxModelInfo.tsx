import React, { useMemo } from 'react'
import type { DomNode } from '../../parser/types'
import './BoxModelInfo.css'

interface BoxModelInfoProps {
  node: DomNode | null
}

const BoxModelInfo: React.FC<BoxModelInfoProps> = ({ node }) => {
  const styleEntries = useMemo(() => {
    if (!node) return []
    return Object.entries(node.computedStyles).slice(0, 12)
  }, [node])

  if (!node) {
    return (
      <div className="box-model-info">
        <div className="box-model-empty">
          <p>选择一个元素查看盒模型信息</p>
        </div>
      </div>
    )
  }

  const { boxModel } = node

  return (
    <div className="box-model-info">
      <div className="info-section">
        <h4 className="info-title">盒模型</h4>
        <div className="box-model-diagram">
          <div className="box-layer margin">
            <div className="box-label">
              margin
              <span className="box-values">
                {boxModel.margin.top} / {boxModel.margin.right} / {boxModel.margin.bottom} / {boxModel.margin.left}
              </span>
            </div>
            <div className="box-layer border">
              <div className="box-label-small">border</div>
              <div className="box-layer padding">
                <div className="box-label-small">padding</div>
                <div className="box-layer content">
                  <span className="content-size">
                    {boxModel.content.width} × {boxModel.content.height}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h4 className="info-title">位置与尺寸</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">宽度</span>
            <span className="info-value">{node.width}px</span>
          </div>
          <div className="info-item">
            <span className="info-label">高度</span>
            <span className="info-value">{node.height}px</span>
          </div>
          <div className="info-item">
            <span className="info-label">offsetLeft</span>
            <span className="info-value">{node.offsetLeft}px</span>
          </div>
          <div className="info-item">
            <span className="info-label">offsetTop</span>
            <span className="info-value">{node.offsetTop}px</span>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h4 className="info-title">计算样式</h4>
        <div className="style-list">
          {styleEntries.map(([key, value]) => (
            <div key={key} className="style-item">
              <span className="style-key">{key}</span>
              <span className="style-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="info-section">
        <h4 className="info-title">层叠上下文</h4>
        <div className="stacking-info">
          <div className="info-item">
            <span className="info-label">z-index</span>
            <span className="info-value">
              {node.zIndex !== undefined ? node.zIndex : 'auto'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">层叠上下文</span>
            <span className={`info-value ${node.hasStackingContext ? 'yes' : 'no'}`}>
              {node.hasStackingContext ? '是' : '否'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">嵌套深度</span>
            <span className="info-value">{node.depth} 层</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(BoxModelInfo)
