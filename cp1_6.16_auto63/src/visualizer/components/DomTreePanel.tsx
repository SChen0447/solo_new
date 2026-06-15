import React, { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Box } from 'lucide-react'
import type { DomNode } from '../../parser/types'
import { useAppStore } from '../../store/useAppStore'
import { EventType, eventBus } from '../../eventBus'
import './DomTreePanel.css'

interface TreeNodeProps {
  node: DomNode
  selectedId: string | null
  highlightedId: string | null
  onSelect: (node: DomNode) => void
  level: number
}

const TreeNode: React.FC<TreeNodeProps> = React.memo(({
  node,
  selectedId,
  highlightedId,
  onSelect,
  level,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = node.children.length > 0

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  const handleClick = useCallback(() => {
    onSelect(node)
  }, [node, onSelect])

  const isSelected = node.id === selectedId
  const isHighlighted = node.id === highlightedId

  const displayName = useMemo(() => {
    let name = node.tagName
    if (node.className) {
      const firstClass = node.className.split(' ')[0]
      name += `.${firstClass}`
    }
    return name
  }, [node.tagName, node.className])

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="tree-toggle-btn"
            onClick={handleToggle}
            aria-label={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <Box size={14} className="tree-node-icon" />
        <span className="tree-node-label">{displayName}</span>
        <span className="tree-node-size">
          {node.width} × {node.height}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              highlightedId={highlightedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
})

TreeNode.displayName = 'TreeNode'

interface DomTreePanelProps {
  domTree: DomNode[]
}

const DomTreePanel: React.FC<DomTreePanelProps> = ({ domTree }) => {
  const { selectedNodeId, highlightedNodeId, setSelectedNodeId, leftPanelCollapsed } = useAppStore()

  const handleNodeSelect = useCallback((node: DomNode) => {
    setSelectedNodeId(node.id)
    eventBus.emit(EventType.NODE_SELECTED, node)
    eventBus.emit(EventType.NODE_HIGHLIGHT, node.id)
  }, [setSelectedNodeId])

  const totalElements = useMemo(() => {
    let count = 0
    const traverse = (nodes: DomNode[]) => {
      for (const node of nodes) {
        count++
        if (node.children.length > 0) {
          traverse(node.children)
        }
      }
    }
    traverse(domTree)
    return count
  }, [domTree])

  if (leftPanelCollapsed) {
    return (
      <div className="dom-tree-panel collapsed">
        <div className="panel-header-collapsed">
          <Box size={18} />
        </div>
      </div>
    )
  }

  return (
    <div className="dom-tree-panel">
      <div className="panel-header">
        <span className="panel-title">DOM 树</span>
        <span className="panel-count">{totalElements} 个元素</span>
      </div>
      <div className="panel-content">
        {domTree.length === 0 ? (
          <div className="empty-state">
            <Box size={32} className="empty-icon" />
            <p>暂无数据</p>
            <p className="empty-hint">上传HTML或粘贴代码开始分析</p>
          </div>
        ) : (
          <div className="tree-container">
            {domTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedNodeId}
                highlightedId={highlightedNodeId}
                onSelect={handleNodeSelect}
                level={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(DomTreePanel)
