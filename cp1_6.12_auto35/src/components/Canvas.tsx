import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Rect, Arrow, RegularPolygon } from 'react-konva';
import Konva from 'konva';
import { useNetworkStore } from '../store';
import { Device, DEVICE_RADIUS, DeviceType } from '../types';

interface CanvasProps {
  width: number;
  height: number;
}

const PCIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <Group x={x - 14} y={y - DEVICE_RADIUS - 22}>
    <Rect x={0} y={4} width={28} height={18} fill="#ffffff" stroke="#1e3a5f" strokeWidth={1.5} cornerRadius={2} />
    <Rect x={2} y={6} width={24} height={13} fill="#e8f0fe" />
    <Rect x={6} y={22} width={16} height={3} fill="#1e3a5f" cornerRadius={1} />
    <Rect x={3} y={24} width={22} height={3} fill="#1e3a5f" cornerRadius={1} />
  </Group>
);

const RouterIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <Group x={x - 12} y={y - DEVICE_RADIUS - 22}>
    <Rect x={0} y={10} width={24} height={14} fill="#ffffff" stroke="#1e3a5f" strokeWidth={1.5} cornerRadius={2} />
    <Circle x={6} y={22} radius={1.5} fill="#22c55e" />
    <Circle x={12} y={22} radius={1.5} fill="#f59e0b" />
    <Circle x={18} y={22} radius={1.5} fill="#ef4444" />
    <RegularPolygon x={6} y={6} sides={3} radius={4} fill="#3b82f6" rotation={-90} />
    <RegularPolygon x={12} y={6} sides={3} radius={5} fill="#3b82f6" rotation={-90} opacity={0.7} />
    <RegularPolygon x={18} y={6} sides={3} radius={6} fill="#3b82f6" rotation={-90} opacity={0.4} />
  </Group>
);

const DeviceNode: React.FC<{
  device: Device;
  isSelected: boolean;
  isSource: boolean;
  isTarget: boolean;
  isConnectionTarget: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragStart: () => void;
  onPortMouseDown: () => void;
  onPortMouseUp: () => void;
}> = ({ device, isSelected, isSource, isTarget, isConnectionTarget, onSelect, onDoubleClick, onDragMove, onDragStart, onPortMouseDown, onPortMouseUp }) => {
  const [isHovered, setIsHovered] = useState(false);
  const baseColor = device.type === 'pc' ? '#3b82f6' : '#8b5cf6';
  const bgGradient = device.type === 'pc' ? '#dbeafe' : '#ede9fe';

  return (
    <Group
      x={device.x}
      y={device.y}
      draggable
      onClick={(e) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(); }}
      onDblClick={(e) => { e.cancelBubble = true; onDoubleClick(); }}
      onDragStart={onDragStart}
      onDragMove={(e) => { onDragMove(e.target.x(), e.target.y()); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSelected && (
        <Circle x={0} y={0} radius={DEVICE_RADIUS + 6} stroke="#2563eb" strokeWidth={2.5} dash={[6, 4]} opacity={0.8} />
      )}
      {isConnectionTarget && (
        <Circle x={0} y={0} radius={DEVICE_RADIUS + 12} stroke="#22c55e" strokeWidth={2.5} dash={[4, 4]} opacity={0.7} />
      )}
      <Circle
        x={0} y={0} radius={DEVICE_RADIUS}
        fill={bgGradient}
        stroke={isSelected ? '#2563eb' : isConnectionTarget ? '#22c55e' : isHovered ? baseColor : '#cbd5e1'}
        strokeWidth={isSelected ? 3 : isConnectionTarget ? 3 : isHovered ? 2.5 : 2}
        shadowColor={isSelected ? '#3b82f6' : '#94a3b8'}
        shadowBlur={isSelected ? 15 : isHovered ? 8 : 0}
        shadowOpacity={0.4}
      />
      {device.type === 'pc' ? <PCIcon x={0} y={0} /> : <RouterIcon x={0} y={0} />}
      <Text x={-DEVICE_RADIUS + 5} y={-6} width={DEVICE_RADIUS * 2 - 10} align="center" fontSize={13} fontStyle="bold" fill={baseColor} text={device.type === 'pc' ? 'PC' : 'RT'} />
      <Text x={-50} y={DEVICE_RADIUS + 8} width={100} align="center" fontSize={12} fill="#1e293b" fontStyle="600" text={device.name} />
      {device.config.ip && (
        <Text x={-60} y={DEVICE_RADIUS + 24} width={120} align="center" fontSize={10} fill="#64748b" text={device.config.ip} />
      )}
      {isSource && (
        <Group>
          <Circle x={0} y={-DEVICE_RADIUS - 32} radius={10} fill="#22c55e" stroke="#fff" strokeWidth={2} />
          <Text x={-5} y={-DEVICE_RADIUS - 37} fontSize={10} fill="#fff" text="S" fontStyle="bold" />
        </Group>
      )}
      {isTarget && (
        <Group>
          <Circle x={0} y={-DEVICE_RADIUS - 32} radius={10} fill="#f97316" stroke="#fff" strokeWidth={2} />
          <Text x={-4} y={-DEVICE_RADIUS - 37} fontSize={10} fill="#fff" text="T" fontStyle="bold" />
        </Group>
      )}
      <Group
        x={0} y={DEVICE_RADIUS + 2}
        onMouseDown={(e) => { e.cancelBubble = true; onPortMouseDown(); }}
        onMouseUp={(e) => { e.cancelBubble = true; onPortMouseUp(); }}
        onMouseEnter={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'crosshair'; }}
        onMouseLeave={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'default'; }}
      >
        <Circle x={-12} y={0} radius={5} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
        <Circle x={0} y={0} radius={5} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
        <Circle x={12} y={0} radius={