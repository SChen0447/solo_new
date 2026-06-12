import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MindMapNode, ViewportState, GenerateResponse } from './types';
import MapView from './MapView';
import Toolbar from './Toolbar';

const STORAGE_KEY = 'mindmap_data_v1';

const App: React.FC = () => {
  const [rootNode, setRootNode] = useState<MindMapNode | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 1 });
  const [inputTopic, setInputTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const mapViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { rootNode: savedRoot, viewport: savedViewport } = JSON.parse(saved);
        if (savedRoot) {
          setRootNode(savedRoot);
        }
        if (savedViewport) {
          setViewport(savedViewport);
        }
      } catch (e) {
        console.error('Failed to load saved mindmap', e);
      }
    }
  }, []);

  useEffect(() => {
    if (rootNode) {
      const data = { rootNode, viewport };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [rootNode, viewport]);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const generateMindMap = useCallback(async () => {
    if (!inputTopic.trim()) {
      showToastMessage('请输入主题');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: inputTopic.trim() }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const data: GenerateResponse = await response.json();
      if (data.success) {
        setRootNode(data.data);
        setViewport({ x: 0, y: 0, scale: 1 });
        showToastMessage('思维导图生成成功');
      }
    } catch (error) {
      console.error('Generate failed:', error);
      showToastMessage('生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [inputTopic, showToastMessage]);

  const updateNode = useCallback((nodeId: string, updates: Partial<MindMapNode>) => {
    setRootNode((prev) => {
      if (!prev) return prev;

      const updateRecursive = (node: MindMapNode): MindMapNode => {
        if (node.id === nodeId) {
          return { ...node, ...updates };
        }
        return {
          ...node,
          children: node.children.map(updateRecursive),
        };
      };

      return updateRecursive(prev);
    });
    showToastMessage('已保存');
  }, [showToastMessage]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setRootNode((prev) => {
      if (!prev) return prev;

      const toggleRecursive = (node: MindMapNode): MindMapNode => {
        if (node.id === nodeId) {
          return { ...node, collapsed: !node.collapsed };
        }
        return {
          ...node,
          children: node.children.map(toggleRecursive),
        };
      };

      return toggleRecursive(prev);
    });
  }, []);

  const expandAll = useCallback(() => {
    setRootNode((prev) => {
      if (!prev) return prev;

      const expandRecursive = (node: MindMapNode): MindMapNode => ({
        ...node,
        collapsed: false,
        children: node.children.map(expandRecursive),
      });

      return expandRecursive(prev);
    });
    showToastMessage('已展开所有节点');
  }, [showToastMessage]);

  const collapseAll = useCallback(() => {
    setRootNode((prev) => {
      if (!prev) return prev;

      const collapseRecursive = (node: MindMapNode, depth: number = 0): MindMapNode => ({
        ...node,
        collapsed: depth >= 1,
        children: node.children.map((child) => collapseRecursive(child, depth + 1)),
      });

      return collapseRecursive(prev);
    });
    showToastMessage('已收起所有节点');
  }, [showToastMessage]);

  const searchNodes = useCallback((keyword: string) => {
    setSearchKeyword(keyword);

    if (!keyword.trim() || !rootNode) {
      setHighlightedNodeIds(new Set());
      return;
    }

    const matchedIds = new Set<string>();
    const pathIds = new Set<string>();

    const searchRecursive = (node: MindMapNode, path: string[] = []): boolean => {
      const isMatch = node.text.toLowerCase().includes(keyword.toLowerCase());
      let hasMatchingChild = false;

      for (const child of node.children) {
        if (searchRecursive(child, [...path, node.id])) {
          hasMatchingChild = true;
        }
      }

      if (isMatch) {
        matchedIds.add(node.id);
        path.forEach((id) => pathIds.add(id));
      }

      return isMatch || hasMatchingChild;
    };

    searchRecursive(rootNode);

    setRootNode((prev) => {
      if (!prev) return prev;

      const expandRecursive = (node: MindMapNode): MindMapNode => {
        const shouldExpand = matchedIds.has(node.id) || pathIds.has(node.id);
        return {
          ...node,
          collapsed: shouldExpand ? false : node.collapsed,
          children: node.children.map(expandRecursive),
        };
      };

      return expandRecursive(prev);
    });

    setHighlightedNodeIds(matchedIds);
  }, [rootNode]);

  const moveNode = useCallback((sourceId: string, targetId: string, position: 'inside' | 'before' | 'after') => {
    if (sourceId === targetId) return;

    setRootNode((prev) => {
      if (!prev) return prev;

      let sourceNode: MindMapNode | null = null;

      const findNode = (node: MindMapNode): MindMapNode | null => {
        if (node.id === sourceId) return node;
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
        return null;
      };

      const removeSource = (node: MindMapNode): MindMapNode => {
        if (node.children.some((c) => c.id === sourceId)) {
          sourceNode = node.children.find((c) => c.id === sourceId) || null;
          return {
            ...node,
            children: node.children.filter((c) => c.id !== sourceId),
          };
        }
        return {
          ...node,
          children: node.children.map(removeSource),
        };
      };

      const isDescendant = (node: MindMapNode, targetId: string): boolean => {
        if (node.id === targetId) return true;
        return node.children.some((child) => isDescendant(child, targetId));
      };

      if (isDescendant(findNode(prev)!, targetId)) {
        return prev;
      }

      const rootWithoutSource = removeSource(prev);

      if (!sourceNode) return prev;

      const insertNode = (node: MindMapNode): MindMapNode => {
        if (node.id === targetId) {
          if (position === 'inside') {
            return {
              ...node,
              collapsed: false,
              children: [...node.children, sourceNode!],
            };
          }
          return node;
        }

        const childIndex = node.children.findIndex((c) => c.id === targetId);
        if (childIndex !== -1 && position !== 'inside') {
          const newChildren = [...node.children];
          if (position === 'before') {
            newChildren.splice(childIndex, 0, sourceNode!);
          } else {
            newChildren.splice(childIndex + 1, 0, sourceNode!);
          }
          return { ...node, children: newChildren };
        }

        return {
          ...node,
          children: node.children.map(insertNode),
        };
      };

      return insertNode(rootWithoutSource);
    });

    showToastMessage('节点已移动');
  }, [showToastMessage]);

  const exportToPNG = useCallback(async () => {
    if (!rootNode || !mapViewRef.current) {
      showToastMessage('没有可导出的内容');
      return;
    }

    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const nodePositions: Map<string, { x: number; y: number; width: number; height: number; depth: number; text: string; note?: string }> = new Map();

      const calculatePositions = (
        node: MindMapNode,
        x: number,
        y: number,
        depth: number = 0
      ): { height: number; positions: Array<{ id: string; x: number; y: number; width: number; height: number; depth: number; text: string; note?: string }> } => {
        const nodeWidth = Math.max(120, node.text.length * 14 + 40);
        const nodeHeight = 44;
        const hGap = 80;
        const vGap = 20;

        if (node.collapsed || node.children.length === 0) {
          return {
            height: nodeHeight,
            positions: [{ id: node.id, x, y, width: nodeWidth, height: nodeHeight, depth, text: node.text, note: node.note }],
          };
        }

        const childResults = node.children.map((child, index) => {
          const childY = y + index * (nodeHeight + vGap);
          return calculatePositions(child, x + nodeWidth + hGap, childY, depth + 1);
        });

        const totalHeight = childResults.reduce((sum, r) => sum + r.height + vGap, -vGap);
        const rootY = y + totalHeight / 2 - nodeHeight / 2;

        const allPositions = [
          { id: node.id, x, y: rootY, width: nodeWidth, height: nodeHeight, depth, text: node.text, note: node.note },
          ...childResults.flatMap((r) => r.positions),
        ];

        return { height: Math.max(nodeHeight, totalHeight), positions: allPositions };
      };

      const result = calculatePositions(rootNode, 60, 60, 0);
      result.positions.forEach((p) => nodePositions.set(p.id, p));

      let maxX = 0;
      let maxY = 0;
      nodePositions.forEach((pos) => {
        maxX = Math.max(maxX, pos.x + pos.width);
        maxY = Math.max(maxY, pos.y + pos.height);
      });

      canvas.width = maxX + 60;
      canvas.height = maxY + 60;

      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const getNodeColor = (depth: number) => {
        const colors = ['#1a3a5c', '#4a7c9f', '#7fa9c7', '#a8c4d9'];
        return colors[Math.min(depth, colors.length - 1)];
      };

      const getTextColor = (depth: number) => {
        return depth === 0 ? '#ffffff' : '#1a3a5c';
      };

      const drawConnection = (
        x1: number, y1: number, x2: number, y2: number
      ) => {
        ctx.strokeStyle = '#b0c4d9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const midX = (x1 + x2) / 2;
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
        ctx.stroke();
      };

      const drawConnections = (node: MindMapNode, parentPos?: { x: number; y: number; width: number; height: number }) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        if (parentPos) {
          drawConnection(
            parentPos.x + parentPos.width,
            parentPos.y + parentPos.height / 2,
            pos.x,
            pos.y + pos.height / 2
          );
        }

        if (!node.collapsed) {
          node.children.forEach((child) => drawConnections(child, pos));
        }
      };

      drawConnections(rootNode);

      nodePositions.forEach((pos, id) => {
        const node: MindMapNode | null = (() => {
          const findNode = (n: MindMapNode): MindMapNode | null => {
            if (n.id === id) return n;
            for (const child of n.children) {
              const found = findNode(child);
              if (found) return found;
            }
            return null;
          };
          return findNode(rootNode);
        })();

        if (!node) return;

        const radius = 8;
        ctx.fillStyle = getNodeColor(pos.depth);
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pos.width, pos.height, radius);
        ctx.fill();

        ctx.fillStyle = getTextColor(pos.depth);
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pos.text, pos.x + pos.width / 2, pos.y + pos.height / 2);

        if (pos.note) {
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(pos.x + pos.width - 8, pos.y + 8, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToastMessage('导出成功');
    } catch (error) {
      console.error('Export failed:', error);
      showToastMessage('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [rootNode, showToastMessage]);

  return (
    <div className="app-container">
      <Toolbar
        searchKeyword={searchKeyword}
        onSearch={searchNodes}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onExport={exportToPNG}
        inputTopic={inputTopic}
        onInputChange={setInputTopic}
        onGenerate={generateMindMap}
        isMobilePanelOpen={isMobilePanelOpen}
        onToggleMobilePanel={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
      />

      <div className="canvas-container" ref={mapViewRef}>
        {rootNode ? (
          <MapView
            rootNode={rootNode}
            viewport={viewport}
            onViewportChange={setViewport}
            onUpdateNode={updateNode}
            onToggleCollapse={toggleCollapse}
            onMoveNode={moveNode}
            highlightedNodeIds={highlightedNodeIds}
            searchKeyword={searchKeyword}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <h2>开始创建你的思维导图</h2>
            <p>在左侧输入主题，点击"生成"按钮开始</p>
          </div>
        )}

        {isExporting && (
          <div className="export-overlay">
            <div className="export-text">导出中...</div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>正在生成思维导图...</p>
        </div>
      )}

      {showToast && (
        <div className="toast toast-success">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
