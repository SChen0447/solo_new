import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { Member } from '../App'

const NODE_W = 120
const NODE_H = 140
const LAYER_GAP = 180
const SIBLING_GAP = 40
const VISIBLE_BUFFER = 300

interface TreeNode {
  member: Member
  children: TreeNode[]
  depth: number
  x: number
  y: number
}

interface Props {
  members: Member[]
  onAddMember: (m: Partial<Member>) => Promise<Member>
  onUpdateMember: (id: string, data: Partial<Member>) => Promise<Member>
  onDeleteMember: (id: string) => Promise<void>
  onSelectMember: (m: Member | null) => void
  selectedMember: Member | null
}

function buildTree(members: Member[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  members.forEach(m => {
    map.set(m.id, { member: m, children: [], depth: 0, x: 0, y: 0 })
  })

  const roots: TreeNode[] = []
  members.forEach(m => {
    const node = map.get(m.id)!
    if (m.parent_id && map.has(m.parent_id)) {
      map.get(m.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  function assignDepth(nodes: TreeNode[], depth: number) {
    nodes.forEach(n => {
      n.depth = depth
      assignDepth(n.children, depth + 1)
    })
  }
  assignDepth(roots, 0)

  function layoutNode(node: TreeNode, left: number): number {
    node.y = node.depth * LAYER_GAP + 80
    if (node.children.length === 0) {
      node.x = left + NODE_W / 2
      return left + NODE_W + SIBLING_GAP
    }
    let cur = left
    node.children.forEach(child => {
      cur = layoutNode(child, cur)
    })
    const firstChild = node.children[0]
    const lastChild = node.children[node.children.length - 1]
    node.x = (firstChild.x + lastChild.x) / 2
    return cur
  }

  let offset = 60
  roots.forEach(root => {
    offset = layoutNode(root, offset)
  })

  return roots
}

function getAllNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(nodes: TreeNode[]) {
    nodes.forEach(n => {
      result.push(n)
      walk(n.children)
    })
  }
  walk(roots)
  return result
}

function BezierEdge({ from, to, animDelay }: { from: { x: number; y: number }; to: { x: number; y: number }; animDelay: number }) {
  const midY = (from.y + NODE_H / 2 + to.y) / 2
  const d = `M ${from.x} ${from.y + NODE_H / 2} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
  return (
    <path
      d={d}
      fill="none"
      stroke="#C4A882"
      strokeWidth={2}
      strokeDasharray="6 4"
      style={{
        animation: `bezierFadeIn 0.8s ease ${animDelay}s both`,
        strokeDashoffset: 0,
      }}
    />
  )
}

function NodeCard({
  node,
  isSelected,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  node: TreeNode
  isSelected: boolean
  isDragOver: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const m = node.member
  const initial = m.name ? m.name[0] : '?'
  const birth = m.birth_year || '?'
  const death = m.death_year
  const years = death ? `${birth}-${death}` : `${birth}-`

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: node.x - NODE_W / 2,
        top: node.y,
        width: NODE_W,
        height: NODE_H,
        cursor: 'grab',
        animation: `fadeInScale 0.45s ease ${node.depth * 0.12}s both`,
        zIndex: isSelected ? 10 : isDragOver ? 9 : 1,
      }}
    >
      <div style={{
        background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
        border: isSelected ? '2px solid var(--accent)' : isDragOver ? '2px dashed var(--accent)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 8px',
        textAlign: 'center',
        boxShadow: isSelected ? 'var(--shadow-lg)' : isDragOver ? '0 0 0 3px rgba(212,165,116,0.2)' : 'var(--shadow-sm)',
        transition: 'all 0.25s ease',
        transform: isSelected ? 'scale(1.1)' : undefined,
        transformOrigin: 'top center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: m.avatar ? `url(${m.avatar}) center/cover` : 'var(--accent)',
          margin: '0 auto 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF5E6', fontSize: 22, fontFamily: 'var(--font-display)',
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(74,59,50,0.15)',
        }}>
          {m.avatar ? '' : initial}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: 'var(--font-display)',
        }}>
          {m.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          {years}
        </div>
      </div>
    </div>
  )
}

function VirtualizedCanvas({ nodes, children, totalWidth, totalHeight }: {
  nodes: TreeNode[]
  children: React.ReactNode
  totalWidth: number
  totalHeight: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ top: 0, left: 0, w: 1200, h: 800 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      setViewport({
        top: el.scrollTop,
        left: el.scrollLeft,
        w: el.clientWidth,
        h: el.clientHeight,
      })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const visibleNodes = useMemo(() => {
    return nodes.filter(n =>
      n.x + NODE_W / 2 + VISIBLE_BUFFER > viewport.left &&
      n.x - NODE_W / 2 - VISIBLE_BUFFER < viewport.left + viewport.w &&
      n.y + NODE_H + VISIBLE_BUFFER > viewport.top &&
      n.y - VISIBLE_BUFFER < viewport.top + viewport.h
    )
  }, [nodes, viewport])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{
        width: Math.max(totalWidth, viewport.w),
        height: Math.max(totalHeight, viewport.h),
        position: 'relative',
        minWidth: totalWidth,
        minHeight: totalHeight,
      }}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === BezierEdge) {
            return child
          }
          return child
        })}
        {visibleNodes.map(node => (
          <React.Fragment key={node.member.id}>
            {node.children.map((child, i) => (
              <BezierEdge
                key={`edge-${node.member.id}-${child.member.id}`}
                from={{ x: node.x, y: node.y }}
                to={{ x: child.x, y: child.y }}
                animDelay={child.depth * 0.12}
              />
            ))}
          </React.Fragment>
        ))}
        {visibleNodes.map(node => (
          <NodeRow key={node.member.id} node={node} />
        ))}
      </div>
    </div>
  )
}

function NodeRow({ node }: { node: TreeNode }) {
  return null
}

export default function FamilyTree({
  members, onAddMember, onUpdateMember, onDeleteMember,
  onSelectMember, selectedMember,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBirth, setNewBirth] = useState('')
  const [newDeath, setNewDeath] = useState('')
  const [newParentId, setNewParentId] = useState<string | null>(null)
  const [screenSize, setScreenSize] = useState<'large' | 'medium' | 'small'>('large')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w > 1200) setScreenSize('large')
      else if (w > 768) setScreenSize('medium')
      else setScreenSize('small')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const treeRoots = useMemo(() => buildTree(members), [members])
  const allNodes = useMemo(() => getAllNodes(treeRoots), [treeRoots])

  const totalWidth = useMemo(() => {
    if (allNodes.length === 0) return 800
    return Math.max(...allNodes.map(n => n.x + NODE_W / 2)) + 120
  }, [allNodes])

  const totalHeight = useMemo(() => {
    if (allNodes.length === 0) return 600
    return Math.max(...allNodes.map(n => n.y + NODE_H)) + 120
  }, [allNodes])

  const handleDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }, [])

  const handleDragOver = useCallback((id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback((targetId: string) => async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverId(null)
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    const source = members.find(m => m.id === sourceId)
    const target = members.find(m => m.id === targetId)
    if (!source || !target) return

    if (source.parent_id === targetId) {
      await onUpdateMember(sourceId, { parent_id: null } as Partial<Member>)
    } else {
      let check: string | null = targetId
      let depth = 0
      while (check && depth < 50) {
        if (check === sourceId) return
        const parent = members.find(m => m.id === check)
        check = parent?.parent_id || null
        depth++
      }
      await onUpdateMember(sourceId, { parent_id: targetId } as Partial<Member>)
    }
    setDragId(null)
  }, [members, onUpdateMember])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverId(null)
  }, [])

  const handleAddMember = useCallback(async () => {
    if (!newName.trim()) return
    await onAddMember({
      name: newName.trim(),
      birth_year: newBirth || null,
      death_year: newDeath || null,
      parent_id: newParentId,
      x: 0,
      y: 0,
    })
    setNewName('')
    setNewBirth('')
    setNewDeath('')
    setNewParentId(null)
    setShowAddForm(false)
  }, [newName, newBirth, newDeath, newParentId, onAddMember])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-node]') || target.closest('button') || target.closest('input')) return
    if (e.detail === 2) {
      setShowAddForm(true)
    }
  }, [])

  if (screenSize === 'small') {
    return (
      <div style={{ padding: 'var(--card-padding)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            家族成员
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'var(--accent)', color: '#FFF5E6',
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600,
            }}
          >
            + 添加成员
          </button>
        </div>

        {showAddForm && (
          <AddMemberForm
            name={newName} birth={newBirth} death={newDeath}
            parentId={newParentId} members={members}
            onNameChange={setNewName} onBirthChange={setNewBirth}
            onDeathChange={setNewDeath} onParentChange={setNewParentId}
            onSubmit={handleAddMember} onCancel={() => setShowAddForm(false)}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map(m => (
            <div
              key={m.id}
              onClick={() => onSelectMember(m)}
              style={{
                background: selectedMember?.id === m.id ? 'var(--accent-light)' : 'var(--bg-card)',
                border: selectedMember?.id === m.id ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: 'var(--shadow-sm)',
                animation: 'fadeIn 0.3s ease both',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: m.avatar ? `url(${m.avatar}) center/cover` : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF5E6', fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700,
                flexShrink: 0,
              }}>
                {m.avatar ? '' : m.name?.[0] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {m.birth_year || '?'}{m.death_year ? ` - ${m.death_year}` : ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteMember(m.id) }}
                style={{
                  background: 'none', color: 'var(--text-secondary)', fontSize: 16,
                  padding: 4, borderRadius: 4,
                }}
                title="删除"
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (screenSize === 'medium') {
    return (
      <div style={{ padding: 'var(--card-padding)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
            家族树
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'var(--accent)', color: '#FFF5E6',
              padding: '10px 20px', borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 600,
            }}
          >
            + 添加成员
          </button>
        </div>

        {showAddForm && (
          <AddMemberForm
            name={newName} birth={newBirth} death={newDeath}
            parentId={newParentId} members={members}
            onNameChange={setNewName} onBirthChange={setNewBirth}
            onDeathChange={setNewDeath} onParentChange={setNewParentId}
            onSubmit={handleAddMember} onCancel={() => setShowAddForm(false)}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {treeRoots.map((root, ri) => (
            <MediumTreeNode
              key={root.member.id}
              node={root}
              selectedMember={selectedMember}
              dragOverId={dragOverId}
              editingId={editingId}
              onSelect={onSelectMember}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onEdit={setEditingId}
              onUpdateMember={onUpdateMember}
              onDeleteMember={onDeleteMember}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={handleCanvasClick}
    >
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 20,
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'var(--accent)', color: '#FFF5E6',
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-md)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>+</span> 添加成员
        </button>
      </div>

      {members.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
          color: 'var(--text-secondary)', fontFamily: 'var(--font-display)',
        }}>
          <span style={{ fontSize: 48 }}>🌱</span>
          <p style={{ fontSize: 16 }}>双击画布添加第一位家族成员</p>
          <p style={{ fontSize: 13 }}>或点击上方"添加成员"按钮</p>
        </div>
      )}

      {showAddForm && (
        <div style={{
          position: 'absolute', top: 70, left: 16, zIndex: 30,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--card-padding)', boxShadow: 'var(--shadow-lg)',
          width: 300, animation: 'fadeInScale 0.3s ease',
          border: '1px solid var(--border-color)',
        }}>
          <AddMemberForm
            name={newName} birth={newBirth} death={newDeath}
            parentId={newParentId} members={members}
            onNameChange={setNewName} onBirthChange={setNewBirth}
            onDeathChange={setNewDeath} onParentChange={setNewParentId}
            onSubmit={handleAddMember} onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <VirtualizedTreeCanvas
        nodes={allNodes}
        totalWidth={totalWidth}
        totalHeight={totalHeight}
        selectedMember={selectedMember}
        dragOverId={dragOverId}
        editingId={editingId}
        onSelect={onSelectMember}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onEdit={setEditingId}
        onUpdateMember={onUpdateMember}
        onDeleteMember={onDeleteMember}
      />
    </div>
  )
}

function AddMemberForm({
  name, birth, death, parentId, members,
  onNameChange, onBirthChange, onDeathChange, onParentChange,
  onSubmit, onCancel,
}: {
  name: string; birth: string; death: string; parentId: string | null; members: Member[]
  onNameChange: (v: string) => void; onBirthChange: (v: string) => void
  onDeathChange: (v: string) => void; onParentChange: (v: string | null) => void
  onSubmit: () => void; onCancel: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' }}>
        添加家族成员
      </h3>
      <input
        placeholder="姓名 *"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)', fontSize: 14,
          background: 'var(--bg-primary)',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="出生年份"
          value={birth}
          onChange={e => onBirthChange(e.target.value)}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)', fontSize: 14,
            background: 'var(--bg-primary)',
          }}
        />
        <input
          placeholder="逝世年份"
          value={death}
          onChange={e => onDeathChange(e.target.value)}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)', fontSize: 14,
            background: 'var(--bg-primary)',
          }}
        />
      </div>
      <select
        value={parentId || ''}
        onChange={e => onParentChange(e.target.value || null)}
        style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)', fontSize: 14,
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
        }}
      >
        <option value="">无父级（根节点）</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-light)', color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >取消</button>
        <button
          onClick={onSubmit}
          disabled={!name.trim()}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: '#FFF5E6',
            fontSize: 13, fontWeight: 600,
            opacity: name.trim() ? 1 : 0.5,
          }}
        >添加</button>
      </div>
    </div>
  )
}

function MediumTreeNode({
  node, selectedMember, dragOverId, editingId,
  onSelect, onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onUpdateMember, onDeleteMember,
}: {
  node: TreeNode
  selectedMember: Member | null
  dragOverId: string | null
  editingId: string | null
  onSelect: (m: Member | null) => void
  onDragStart: (id: string) => (e: React.DragEvent) => void
  onDragOver: (id: string) => (e: React.DragEvent) => void
  onDrop: (id: string) => (e: React.DragEvent) => void
  onDragEnd: () => void
  onEdit: (id: string | null) => void
  onUpdateMember: (id: string, data: Partial<Member>) => Promise<Member>
  onDeleteMember: (id: string) => Promise<void>
}) {
  const m = node.member
  const isSelected = selectedMember?.id === m.id
  const isDragOver = dragOverId === m.id
  const isEditing = editingId === m.id
  const [editName, setEditName] = useState(m.name)
  const [editBirth, setEditBirth] = useState(m.birth_year || '')
  const [editDeath, setEditDeath] = useState(m.death_year || '')

  const birth = m.birth_year || '?'
  const death = m.death_year
  const years = death ? `${birth}-${death}` : `${birth}-`

  return (
    <div
      style={{
        marginLeft: node.depth * 40,
        animation: `fadeIn 0.3s ease ${node.depth * 0.08}s both`,
      }}
    >
      <div
        draggable
        onDragStart={onDragStart(m.id)}
        onDragOver={onDragOver(m.id)}
        onDrop={onDrop(m.id)}
        onDragEnd={onDragEnd}
        onClick={() => onSelect(m)}
        style={{
          background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
          border: isSelected ? '2px solid var(--accent)' : isDragOver ? '2px dashed var(--accent)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '6px 0',
          cursor: 'grab',
          boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transition: 'all 0.2s ease',
        }}
      >
        {node.depth > 0 && (
          <div style={{
            width: 24, height: 2, background: 'var(--accent)',
            marginLeft: -28, flexShrink: 0, borderRadius: 1,
          }} />
        )}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: m.avatar ? `url(${m.avatar}) center/cover` : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF5E6', fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700,
          flexShrink: 0,
        }}>
          {m.avatar ? '' : m.name?.[0] || '?'}
        </div>
        {isEditing ? (
          <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={{
              padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)',
              fontSize: 13, width: 80,
            }} />
            <input value={editBirth} onChange={e => setEditBirth(e.target.value)} placeholder="出生" style={{
              padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-color)',
              fontSize: 12, width: 50,
            }} />
            <button onClick={async () => {
              await onUpdateMember(m.id, { name: editName, birth_year: editBirth || null, death_year: editDeath || null })
              onEdit(null)
            }} style={{ padding: '4px 8px', borderRadius: 4, background: 'var(--accent)', color: '#fff', fontSize: 12 }}>✓</button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{m.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{years}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(isEditing ? null : m.id) }} style={{
            background: 'none', color: 'var(--text-secondary)', fontSize: 14, padding: 2,
          }}>✎</button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteMember(m.id) }} style={{
            background: 'none', color: 'var(--text-secondary)', fontSize: 14, padding: 2,
          }}>✕</button>
        </div>
      </div>
      {node.children.map(child => (
        <MediumTreeNode
          key={child.member.id}
          node={child}
          selectedMember={selectedMember}
          dragOverId={dragOverId}
          editingId={editingId}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onEdit={onEdit}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
        />
      ))}
    </div>
  )
}

function VirtualizedTreeCanvas({
  nodes, totalWidth, totalHeight,
  selectedMember, dragOverId, editingId,
  onSelect, onDragStart, onDragOver, onDrop, onDragEnd,
  onEdit, onUpdateMember, onDeleteMember,
}: {
  nodes: TreeNode[]
  totalWidth: number
  totalHeight: number
  selectedMember: Member | null
  dragOverId: string | null
  editingId: string | null
  onSelect: (m: Member | null) => void
  onDragStart: (id: string) => (e: React.DragEvent) => void
  onDragOver: (id: string) => (e: React.DragEvent) => void
  onDrop: (id: string) => (e: React.DragEvent) => void
  onDragEnd: () => void
  onEdit: (id: string | null) => void
  onUpdateMember: (id: string, data: Partial<Member>) => Promise<Member>
  onDeleteMember: (id: string) => Promise<void>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ top: 0, left: 0, w: 1200, h: 800 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      setViewport({
        top: el.scrollTop,
        left: el.scrollLeft,
        w: el.clientWidth,
        h: el.clientHeight,
      })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const visibleNodes = useMemo(() => {
    return nodes.filter(n =>
      n.x + NODE_W / 2 + VISIBLE_BUFFER > viewport.left &&
      n.x - NODE_W / 2 - VISIBLE_BUFFER < viewport.left + viewport.w &&
      n.y + NODE_H + VISIBLE_BUFFER > viewport.top &&
      n.y - VISIBLE_BUFFER < viewport.top + viewport.h
    )
  }, [nodes, viewport])

  const allEdges = useMemo(() => {
    const edges: { from: { x: number; y: number }; to: { x: number; y: number }; depth: number }[] = []
    function walk(treeNodes: TreeNode[]) {
      treeNodes.forEach(n => {
        n.children.forEach(c => {
          edges.push({ from: { x: n.x, y: n.y }, to: { x: c.x, y: c.y }, depth: c.depth })
        })
        walk(n.children)
      })
    }
    walk(nodes.length > 0 ? getRoots(nodes) : [])
    return edges
  }, [nodes])

  const visibleEdges = useMemo(() => {
    return allEdges.filter(e =>
      e.from.x + VISIBLE_BUFFER > viewport.left &&
      e.from.x - VISIBLE_BUFFER < viewport.left + viewport.w &&
      e.to.x + VISIBLE_BUFFER > viewport.left &&
      e.to.x - VISIBLE_BUFFER < viewport.left + viewport.w &&
      e.from.y + NODE_H + VISIBLE_BUFFER > viewport.top &&
      e.to.y + VISIBLE_BUFFER > viewport.top &&
      e.from.y - VISIBLE_BUFFER < viewport.top + viewport.h &&
      e.to.y - VISIBLE_BUFFER < viewport.top + viewport.h
    )
  }, [allEdges, viewport])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    >
      <svg
        width={Math.max(totalWidth, viewport.w)}
        height={Math.max(totalHeight, viewport.h)}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {visibleEdges.map((edge, i) => {
          const midY = (edge.from.y + NODE_H / 2 + edge.to.y) / 2
          const d = `M ${edge.from.x} ${edge.from.y + NODE_H / 2} C ${edge.from.x} ${midY}, ${edge.to.x} ${midY}, ${edge.to.x} ${edge.to.y}`
          return (
            <path
              key={`edge-${i}`}
              d={d}
              fill="none"
              stroke="#C4A882"
              strokeWidth={2}
              strokeDasharray="6 4"
              style={{
                animation: `bezierFadeIn 0.8s ease ${edge.depth * 0.12}s both`,
              }}
            />
          )
        })}
      </svg>
      <div style={{
        width: Math.max(totalWidth, viewport.w),
        height: Math.max(totalHeight, viewport.h),
        position: 'relative',
        minWidth: totalWidth,
        minHeight: totalHeight,
      }}>
        {visibleNodes.map(node => (
          <NodeCard
            key={node.member.id}
            node={node}
            isSelected={selectedMember?.id === node.member.id}
            isDragOver={dragOverId === node.member.id}
            onSelect={() => onSelect(node.member)}
            onDragStart={onDragStart(node.member.id)}
            onDragOver={onDragOver(node.member.id)}
            onDrop={onDrop(node.member.id)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  )
}

function getRoots(nodes: TreeNode[]): TreeNode[] {
  const ids = new Set(nodes.map(n => n.member.id))
  return nodes.filter(n => !n.member.parent_id || !ids.has(n.member.parent_id))
}
