import React, { useMemo } from 'react';
import { MindMapNode } from './nodeStore';

interface ConnectionLinesProps {
  nodes: Record<string, MindMapNode>;
  rootId: string | null;
  nodeWidth?: number;
  nodeHeight?: number;
  scale: number;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  nodes,
  rootId,
  nodeWidth = 160,
  nodeHeight = 48,
  scale
}) => {
  const baseStrokeWidth = 2;
  const strokeWidth = baseStrokeWidth / scale;

  const paths = useMemo(() => {
    const result: { d: string; color: string; id: string }[] = [];

    function traverse(nodeId: string) {
      const node = nodes[nodeId];
      if (!node || node.collapsed) return;

      const startX = node.x + nodeWidth;
      const startY = node.y + nodeHeight / 2;

      node.children.forEach((childId) => {
        const child = nodes[childId];
        if (!child) return;

        const endX = child.x;
        const endY = child.y + nodeHeight / 2;

        const dx = Math.abs(endX - startX);
        const controlOffset = Math.max(dx * 0.5, 60);

        const cp1x = startX + controlOffset;
        const cp1y = startY;
        const cp2x = endX - controlOffset;
        const cp2y = endY;

        const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

        result.push({
          d,
          color: child.color || '#4A6FA5',
          id: `${nodeId}-${childId}`
        });

        traverse(childId);
      });
    }

    if (rootId) {
      traverse(rootId);
    }

    return result;
  }, [nodes, rootId, nodeWidth, nodeHeight]);

  return (
    <svg
      className="connection-svg"
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((path) => (
        <path
          key={path.id}
          d={path.d}
          stroke={path.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
          filter="url(#glow)"
          style={{
            transition: 'stroke-width 0.1s ease'
          }}
        />
      ))}
    </svg>
  );
};

export default ConnectionLines;
