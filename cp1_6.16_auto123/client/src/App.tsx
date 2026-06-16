import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SkillTree, SkillNode } from './types';
import SkillTreeCanvas from './components/SkillTreeCanvas';
import PropertyPanel from './components/PropertyPanel';
import BalancePanel from './components/BalancePanel';

const ROOM_ID = 'default-room';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [skillTree, setSkillTree] = useState<SkillTree | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'property' | 'balance'>('property');
  const [showResetModal, setShowResetModal] = useState(false);
  const [pointsWarning, setPointsWarning] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [treeName, setTreeName] = useState('新技能树');
  const [totalPointsInput, setTotalPointsInput] = useState(100);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', ROOM_ID);
    });

    newSocket.on('skill-tree-data', (data: SkillTree) => {
      setSkillTree(data);
      setTreeName(data.name);
      setTotalPointsInput(data.totalPoints);
    });

    newSocket.on('node-added', (node: SkillNode) => {
      setSkillTree(prev => prev ? {
        ...prev,
        nodes: [...prev.nodes, node],
      } : prev);
    });

    newSocket.on('node-updated', (nodeId: string, updates: Partial<SkillNode>) => {
      setSkillTree(prev => {
        if (!prev) return prev;
        const newNodes = prev.nodes.map(n =>
          n.id === nodeId ? { ...n, ...updates } : n
        );
        const usedPoints = newNodes.reduce((sum, n) =>
          sum + n.currentLevel * n.costPerLevel, 0
        );
        return { ...prev, nodes: newNodes, usedPoints };
      });
    });

    newSocket.on('node-deleted', (nodeId: string) => {
      setSkillTree(prev => {
        if (!prev) return prev;
        const newNodes = prev.nodes
          .filter(n => n.id !== nodeId)
          .map(n => n.parentId === nodeId ? { ...n, parentId: null } : n);
        const usedPoints = newNodes.reduce((sum, n) =>
          sum + n.currentLevel * n.costPerLevel, 0
        );
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(null);
        }
        return { ...prev, nodes: newNodes, usedPoints };
      });
    });

    newSocket.on('node-moved', (nodeId: string, x: number, y: number) => {
      setSkillTree(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n =>
            n.id === nodeId ? { ...n, x, y } : n
          ),
        };
      });
    });

    newSocket.on('total-points-updated', (points: number) => {
      setSkillTree(prev => prev ? { ...prev, totalPoints: points } : prev);
      setTotalPointsInput(points);
    });

    newSocket.on('points-reset', (data: SkillTree) => {
      setSkillTree(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [selectedNodeId]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setActiveTab('property');
    }
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<SkillNode>) => {
    if (socket) {
      socket.emit('update-node', nodeId, updates);
      setSkillTree(prev => {
        if (!prev) return prev;
        const newNodes = prev.nodes.map(n =>
          n.id === nodeId ? { ...n, ...updates } : n
        );
        const usedPoints = newNodes.reduce((sum, n) =>
          sum + n.currentLevel * n.costPerLevel, 0
        );
        return { ...prev, nodes: newNodes, usedPoints };
      });
    }
  }, [socket]);

  const handleNodeAdd = useCallback((node: SkillNode) => {
    if (socket) {
      socket.emit('add-node', node);
      setSkillTree(prev => prev ? {
        ...prev,
        nodes: [...prev.nodes, node],
      } : prev);
    }
  }, [socket]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    if (socket) {
      socket.emit('delete-node', nodeId);
      setSkillTree(prev => {
        if (!prev) return prev;
        const newNodes = prev.nodes
          .filter(n => n.id !== nodeId)
          .map(n => n.parentId === nodeId ? { ...n, parentId: null } : n);
        const usedPoints = newNodes.reduce((sum, n) =>
          sum + n.currentLevel * n.costPerLevel, 0
        );
        return { ...prev, nodes: newNodes, usedPoints };
      });
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    }
  }, [socket, selectedNodeId]);

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    if (socket) {
      socket.emit('move-node', nodeId, x, y);
      setSkillTree(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n =>
            n.id === nodeId ? { ...n, x, y } : n
          ),
        };
      });
    }
  }, [socket]);

  const handleAddPoint = useCallback((nodeId: string) => {
    if (!skillTree) return;
    const node = skillTree.nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.currentLevel >= node.maxLevel) return;
    if (node.parentId) {
      const parent = skillTree.nodes.find(n => n.id === node.parentId);
      if (!parent || parent.currentLevel === 0) return;
    }

    const remainingPoints = skillTree.totalPoints - skillTree.usedPoints;
    if (remainingPoints < node.costPerLevel) {
      setPointsWarning(true);
      setTimeout(() => setPointsWarning(false), 1000);
      return;
    }

    handleNodeUpdate(nodeId, { currentLevel: node.currentLevel + 1 });
  }, [skillTree, handleNodeUpdate]);

  const handleResetPoints = useCallback(() => {
    setPanelClosing(true);
    setTimeout(() => {
      if (socket) {
        socket.emit('reset-points');
        setSkillTree(prev => {
          if (!prev) return prev;
          const newNodes = prev.nodes.map(n =>
            n.parentId === null ? n : { ...n, currentLevel: 0 }
          );
          return { ...prev, nodes: newNodes, usedPoints: 0 };
        });
      }
      setShowResetModal(false);
      setPanelClosing(false);
    }, 400);
  }, [socket]);

  const handleTotalPointsChange = useCallback((points: number) => {
    const clamped = Math.max(50, Math.min(500, points));
    setTotalPointsInput(clamped);
    if (socket) {
      socket.emit('set-total-points', clamped);
      setSkillTree(prev => prev ? { ...prev, totalPoints: clamped } : prev);
    }
  }, [socket]);

  const selectedNode = skillTree?.nodes.find(n => n.id === selectedNodeId) || null;
  const remainingPoints = skillTree ? skillTree.totalPoints - skillTree.usedPoints : 0;

  if (!skillTree) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: '#9E9E9E', fontSize: 16 }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-title">SKILL TREE DESIGNER</div>
        <input
          type="text"
          className="toolbar-input"
          value={treeName}
          onChange={(e) => setTreeName(e.target.value)}
          placeholder="技能树名称"
          style={{ width: 180 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: '#9E9E9E' }}>总点数:</span>
          <input
            type="number"
            className="toolbar-input"
            value={totalPointsInput}
            onChange={(e) => handleTotalPointsChange(parseInt(e.target.value) || 50)}
            min={50}
            max={500}
            style={{ width: 80 }}
          />
          <button
            className="toolbar-button danger"
            onClick={() => setShowResetModal(true)}
          >
            重置加点
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="canvas-container">
          <SkillTreeCanvas
            nodes={skillTree.nodes}
            selectedNodeId={selectedNodeId}
            totalPoints={skillTree.totalPoints}
            usedPoints={skillTree.usedPoints}
            onNodeSelect={handleNodeSelect}
            onNodeAdd={handleNodeAdd}
            onNodeMove={handleNodeMove}
            onNodeDelete={handleNodeDelete}
            onNodeUpdate={handleNodeUpdate}
            onAddPoint={handleAddPoint}
          />
        </div>

        <div className={`side-panel ${pointsWarning ? 'panel-warning' : ''} ${panelClosing ? 'panel-close' : ''}`}>
          <div className="panel-tabs">
            <div
              className={`panel-tab ${activeTab === 'property' ? 'active' : ''}`}
              onClick={() => setActiveTab('property')}
            >
              属性配置
            </div>
            <div
              className={`panel-tab ${activeTab === 'balance' ? 'active' : ''}`}
              onClick={() => setActiveTab('balance')}
            >
              平衡分析
            </div>
          </div>
          <div className="panel-content">
            {activeTab === 'property' ? (
              <PropertyPanel
                node={selectedNode}
                onUpdate={handleNodeUpdate}
              />
            ) : (
              <BalancePanel
                nodes={skillTree.nodes}
                totalPoints={skillTree.totalPoints}
                usedPoints={skillTree.usedPoints}
              />
            )}
          </div>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span>剩余点数:</span>
          <span className={`status-value ${remainingPoints < 10 ? 'danger' : remainingPoints < 30 ? 'warning' : ''}`}>
            {remainingPoints}
          </span>
        </div>
        <div className="status-item">
          <span>已消耗:</span>
          <span className="status-value">{skillTree.usedPoints}</span>
        </div>
        <div className="status-item">
          <span>节点数:</span>
          <span className="status-value">{skillTree.nodes.length}</span>
        </div>
        <div className="status-item" style={{ marginLeft: 'auto' }}>
          <span className="hint-text">双击空白处创建新节点 · 拖拽移动 · 右键菜单</span>
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认重置</div>
            <div className="modal-content">
              确定要重置所有加点吗？此操作将清空所有已分配的技能点数。
            </div>
            <div className="modal-actions">
              <button
                className="toolbar-button"
                onClick={() => setShowResetModal(false)}
              >
                取消
              </button>
              <button
                className="toolbar-button danger"
                onClick={handleResetPoints}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
