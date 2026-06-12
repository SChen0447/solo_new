import React, { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
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
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isExporting, setIsExporting] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  const showToastMessage = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const generateMindMap = useCallback(async () => {
    if (!inputTopic.trim()) {
      showToastMessage('请输入主题', 'error');
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
        setSearchKeyword('');
        setHighlightedNodeIds(new Set());
        showToastMessage('思维导图生成成功', 'success');
      }
    } catch (error) {
      console.error('Generate failed:', error);
      showToastMessage('生成失败，请重试', 'error');
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
    showToastMessage('已保存', 'success');
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
    showToastMessage('已展开所有节点', 'success');
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
    showToastMessage('已收起所有节点', 'success');
  }, [showToastMessage]);

  const searchNodes = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    const trimmedKeyword = keyword.trim().toLowerCase();

    if (!trimmedKeyword || !rootNode) {
      setHighlightedNodeIds(new Set());
      return;
    }

    const matchedIds = new Set<string>();
    const pathIds: string[] = [];

    const searchRecursive = (node: MindMapNode, currentPath: string[] = []): boolean => {
      const isMatch = node.text.toLowerCase().includes(trimmedKeyword);
      let hasMatchingDescendant = false;

      for (const child of node.children) {
        if (searchRecursive(child, [...currentPath, node.id])) {
          hasMatchingDescendant = true;
        }
      }

      if (isMatch) {
        matchedIds.add(node.id);
        currentPath.forEach((id) => pathIds.push(id));
      }

      return isMatch || hasMatchingDescendant;
    };

    searchRecursive(rootNode);

    const allPathIds = new Set(pathIds);

    setRootNode((prev) => {
      if (!prev) return prev;

      const expandRecursive = (node: MindMapNode): MindMapNode => {
        const shouldExpand = matchedIds.has(node.id) || allPathIds.has(node.id);
        return {
          ...node,
          collapsed: shouldExpand ? false : node.collapsed,
          children: node.children.map(expandRecursive),
        };
      };

      return expandRecursive(prev);
    });

    setHighlightedNodeIds(matchedIds);

    if (matchedIds.size === 0) {
      showToastMessage('未找到匹配的节点', 'error');
    } else {
      showToastMessage(`找到 ${matchedIds.size} 个匹配节点`, 'success');
    }
  }, [rootNode, showToastMessage]);

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

      const isDescendant = (node: MindMapNode, target: string): boolean => {
        if (node.id === target) return true;
        return node.children.some((child) => isDescendant(child, target));
      };

      const sourceNodeData = findNode(prev);
      if (!sourceNodeData) return prev;
      if (isDescendant(sourceNodeData, targetId)) {
        showToastMessage('不能将节点移动到其子节点下', 'error');
        return prev;
      }

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

    showToastMessage('节点已移动', 'success');
  }, [showToastMessage]);

  const exportToPNG = useCallback(async () => {
    if (!rootNode || !canvasContainerRef.current) {
      showToastMessage('没有可导出的内容', 'error');
      return;
    }

    setIsExporting(true);

    await new Promise((r) => setTimeout(r, 50));

    try {
      const mapCanvasEl = canvasContainerRef.current.querySelector('.map-canvas') as HTMLElement;
      if (!mapCanvasEl) {
        throw new Error('找不到导图元素');
      }

      const toolbar = document.querySelector('.toolbar') as HTMLElement;
      const mobileToggleBtn = document.querySelector('.mobile-toggle-btn') as HTMLElement;
      const zoomIndicator = document.querySelector('.zoom-indicator') as HTMLElement;
      const viewportCoords = document.querySelector('.viewport-coords') as HTMLElement;

      const elementsToHide = [toolbar, mobileToggleBtn, zoomIndicator, viewportCoords];
      const originalDisplays: string[] = [];

      elementsToHide.forEach((el) => {
        if (el) {
          originalDisplays.push(el.style.display);
          el.style.display = 'none';
        }
      });

      const originalTransform = mapCanvasEl.style.transform;
      mapCanvasEl.style.transform = 'none';

      try {
        const canvas = await html2canvas(mapCanvasEl, {
          backgroundColor: '#f0f4f8',
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const link = document.createElement('a');
        link.download = `mindmap-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToastMessage('导出成功', 'success');
      } finally {
        mapCanvasEl.style.transform = originalTransform;
        elementsToHide.forEach((el, index) => {
          if (el) {
            el.style.display = originalDisplays[index] || '';
          }
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      showToastMessage('导出失败，请重试', 'error');
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

      <div className="canvas-container" ref={canvasContainerRef}>
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
            <div className="export-spinner"></div>
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
        <div className={`toast toast-${toastType}`}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
