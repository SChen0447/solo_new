import { useCallback, useMemo, memo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  NodeProps,
  BackgroundVariant,
  NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Trash2 } from 'lucide-react';
import { useGameStore, GameNode as GameNodeType } from './store';

const CustomNode = memo(({ data, selected, id }: NodeProps<{
  label: string;
  description: string;
  options: number;
  backgroundColor: string;
  onDelete: (id: string) => void;
}>) => {
  const previewText = data.description.length > 50
    ? data.description.slice(0, 50) + '...'
    : data.description || '双击编辑描述...';

  return (
    <div
      className={`
        relative min-w-[180px] max-w-[240px] rounded-node border-2
        transition-all duration-200 ease-out cursor-grab active:cursor-grabbing
        ${selected
          ? 'border-primary shadow-node-selected scale-[1.02]'
          : 'border-editor-border hover:shadow-node-hover hover:scale-[1.01]'
        }
      `}
      style={{
        backgroundColor: data.backgroundColor,
        willChange: 'transform, box-shadow',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />

      <div className="p-3 pointer-events-none">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-editor-text/60">
            {id.slice(0, 6)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
            className="pointer-events-auto p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="text-sm text-editor-text leading-relaxed font-serif">
          {previewText}
        </div>

        {data.options > 0 && (
          <div className="mt-2 pt-2 border-t border-editor-border/50">
            <span className="text-xs font-mono text-editor-text/50">
              {data.options} 个选项
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

const EditorCanvas = () => {
  const {
    nodes: gameNodes,
    edges: gameEdges,
    selectNode,
    deleteNode,
    addEdge: storeAddEdge,
    updateNodePosition,
    selectedNodeId,
  } = useGameStore();

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
  }), []);

  const internalNodes: Node[] = useMemo(() => {
    return gameNodes.map((node: GameNodeType) => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      draggable: true,
      selectable: true,
      data: {
        label: node.id,
        description: node.description,
        options: node.options.length,
        backgroundColor: node.backgroundColor,
        onDelete: deleteNode,
      },
      selected: selectedNodeId === node.id,
    }));
  }, [gameNodes, selectedNodeId, deleteNode]);

  const internalEdges: Edge[] = useMemo(() => {
    return gameEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#6c63ff',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6c63ff',
        width: 20,
        height: 20,
      },
    }));
  }, [gameEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, internalNodes);

    changes.forEach((change) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        updateNodePosition(change.id, change.position);
        useGameStore.getState().saveToStorage();
      }
      if (change.type === 'position' && change.position && change.dragging) {
        updateNodePosition(change.id, change.position);
      }
      if (change.type === 'select') {
        if (change.selected) {
          selectNode(change.id);
        }
      }
    });

    void updatedNodes;
  }, [internalNodes, updateNodePosition, selectNode]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6c63ff', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6c63ff',
          width: 20,
          height: 20,
        },
      }, internalEdges);

      storeAddEdge(params.source, params.target, params.sourceHandle || undefined);
    }
  }, [internalEdges, storeAddEdge]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  useEffect(() => {
    void 0;
  }, [gameNodes]);

  return (
    <div className="flex-1 h-full bg-editor-bg">
      <ReactFlow
        nodes={internalNodes}
        edges={internalEdges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnDrag={true}
        selectionOnDrag={false}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.5}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6c63ff', strokeWidth: 2 },
        }}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#d1d5db"
        />
        <Controls
          className="bg-white rounded-lg shadow-lg border border-editor-border overflow-hidden"
          position="bottom-left"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white rounded-lg shadow-lg border border-editor-border !w-40 !h-40"
          nodeColor="#6c63ff"
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-right"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

export default memo(EditorCanvas);
