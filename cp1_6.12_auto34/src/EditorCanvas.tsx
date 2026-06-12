import { useCallback, useMemo, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  NodeProps,
  BackgroundVariant,
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
        relative min-w-[180px] max-w-[240px] rounded-node border-2 bg-white
        transition-all duration-200 ease-out cursor-pointer
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

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-editor-text/60">
            {id.slice(0, 6)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
            className="p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
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

  const nodes: Node[] = useMemo(() => {
    return gameNodes.map((node: GameNodeType) => ({
      id: node.id,
      type: 'custom',
      position: node.position,
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

  const edges: Edge[] = useMemo(() => {
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

  const [, setNodes, onNodesChange] = useNodesState(nodes);
  const [, setEdges, onEdgesChange] = useEdgesState(edges);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      setEdges((eds) => addEdge({
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
      }, eds));

      storeAddEdge(params.source, params.target, params.sourceHandle || undefined);
    }
  }, [setEdges, storeAddEdge]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    updateNodePosition(node.id, node.position);
    useGameStore.getState().saveToStorage();
  }, [updateNodePosition]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="flex-1 h-full bg-editor-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
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
          size={1}
          color="#d1d5db"
        />
        <Controls
          className="bg-white rounded-lg shadow-lg border border-editor-border"
          position="bottom-left"
        />
        <MiniMap
          className="bg-white rounded-lg shadow-lg border border-editor-border !w-32 !h-32"
          nodeColor="#6c63ff"
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
};

export default memo(EditorCanvas);
