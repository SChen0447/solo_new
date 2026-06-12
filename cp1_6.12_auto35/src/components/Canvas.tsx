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
    <Rect
      x={0}
      y={4}
      width={28}
      height={18}
      fill="#ffffff"
      stroke="#1e3a5f"
      strokeWidth={1.5}
      cornerRadius={2}
    />
    <Rect x={2} y={6} width={24} height={13} fill="#e8f0fe" />
    <Rect x={6} y={22} width={16} height={3} fill="#1e3a5f" cornerRadius={1} />
    <Rect x={3} y={24} width={22} height={3} fill="#1e3a5f" cornerRadius={1} />
  </Group>
);

const RouterIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <Group x={x - 12} y={y - DEVICE_RADIUS - 22}>
    <Rect
      x={0}
      y={10}
      width={24}
      height={14}
      fill="#ffffff"
      stroke="#1e3a5f"
      strokeWidth={1.5}
      cornerRadius={2}
    />
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
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragStart: () => void;
  onPortMouseDown: () => void;
}> = ({ device, isSelected, isSource, isTarget, onSelect, onDoubleClick, onDragMove, onDragStart, onPortMouseDown }) => {
  const [isHovered, setIsHovered] = useState(false);
  const baseColor = device.type === 'pc' ? '#3b82f6' : '#8b5cf6';
  const bgGradient = device.type === 'pc' ? '#dbeafe' : '#ede9fe';

  return (
    <Group
      x={device.x}
      y={device.y}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onDoubleClick();
      }}
      onDragStart={onDragStart}
      onDragMove={(e) => {
        onDragMove(e.target.x(), e.target.y());
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isSelected && (
        <Circle
          x={0}
          y={0}
          radius={DEVICE_RADIUS + 6}
          stroke="#2563eb"
          strokeWidth={2.5}
          dash={[6, 4]}
          opacity={0.8}
        />
      )}
      <Circle
        x={0}
        y={0}
        radius={DEVICE_RADIUS}
        fill={bgGradient}
        stroke={isSelected ? '#2563eb' : isHovered ? baseColor : '#cbd5e1'}
        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
        shadowColor={isSelected ? '#3b82f6' : '#94a3b8'}
        shadowBlur={isSelected ? 15 : isHovered ? 8 : 0}
        shadowOpacity={0.4}
      />
      {device.type === 'pc' ? (
        <PCIcon x={0} y={0} />
      ) : (
        <RouterIcon x={0} y={0} />
      )}
      <Text
        x={-DEVICE_RADIUS + 5}
        y={-6}
        width={DEVICE_RADIUS * 2 - 10}
        align="center"
        fontSize={13}
        fontStyle="bold"
        fill={baseColor}
        text={device.type === 'pc' ? 'PC' : 'RT'}
      />
      <Text
        x={-50}
        y={DEVICE_RADIUS + 8}
        width={100}
        align="center"
        fontSize={12}
        fill="#1e293b"
        fontStyle="600"
        text={device.name}
      />
      {device.config.ip && (
        <Text
          x={-60}
          y={DEVICE_RADIUS + 24}
          width={120}
          align="center"
          fontSize={10}
          fill="#64748b"
          text={device.config.ip}
        />
      )}
      {isSource && (
        <Circle x={0} y={-DEVICE_RADIUS - 32} radius={8} fill="#22c55e" stroke="#fff" strokeWidth={2} />
      )}
      {isTarget && (
        <Circle x={0} y={-DEVICE_RADIUS - 32} radius={8} fill="#f97316" stroke="#fff" strokeWidth={2} />
      )}
      <Group
        x={0}
        y={DEVICE_RADIUS + 2}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onPortMouseDown();
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'crosshair';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      >
        <Circle x={-12} y={0} radius={5} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
        <Circle x={0} y={0} radius={5} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
        <Circle x={12} y={0} radius={5} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
      </Group>
    </Group>
  );
};

export const NetworkCanvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const {
    devices,
    connections,
    selectedDeviceId,
    selectedConnectionId,
    sourceDeviceId,
    targetDeviceId,
    draggingFromDeviceId,
    isDraggingNewConnection,
    addDevice,
    updateDevicePosition,
    selectDevice,
    selectConnection,
    deleteDevice,
    deleteConnection,
    openConfigPanel,
    setSourceDevice,
    setTargetDevice,
    startDraggingConnection,
    stopDraggingConnection,
    addConnection,
  } = useNetworkStore();

  const [draggingLineEnd, setDraggingLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragFromDevice, setDragFromDevice] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ type: DeviceType } | null>(null);

  const handleStageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const deviceType = e.dataTransfer.getData('deviceType') as DeviceType;
      if (!deviceType) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.container().getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addDevice(deviceType, x, y);
    },
    [addDevice]
  );

  const handleStageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDeviceSelect = useCallback(
    (device: Device) => {
      selectDevice(device.id);
      if (!sourceDeviceId) {
        setSourceDevice(device.id);
      } else if (!targetDeviceId && sourceDeviceId !== device.id) {
        setTargetDevice(device.id);
      } else {
        setSourceDevice(device.id);
        setTargetDevice(null);
      }
    },
    [selectDevice, sourceDeviceId, targetDeviceId, setSourceDevice, setTargetDevice]
  );

  const handlePortMouseDown = useCallback(
    (deviceId: string) => {
      startDraggingConnection(deviceId);
      setDragFromDevice(deviceId);
      const dev = devices.find((d) => d.id === deviceId);
      if (dev) {
        setDraggingLineEnd({ x: dev.x, y: dev.y });
      }
    },
    [devices, startDraggingConnection]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingNewConnection && dragFromDevice && stageRef.current) {
        const stage = stageRef.current;
        const rect = stage.container().getBoundingClientRect();
        setDraggingLineEnd({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    const handleMouseUp = () => {
      if (isDraggingNewConnection && dragFromDevice) {
        stopDraggingConnection();
        setDraggingLineEnd(null);
        setDragFromDevice(null);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingNewConnection, dragFromDevice, stopDraggingConnection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedDeviceId) {
          deleteDevice(selectedDeviceId);
        } else if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDeviceId, selectedConnectionId, deleteDevice, deleteConnection]);

  const fromDevice = dragFromDevice ? devices.find((d) => d.id === dragFromDevice) : null;

  return (
    <div
      onDrop={handleStageDrop}
      onDragOver={handleStageDragOver}
      style={{ width: '100%', height: '100%', background: '#f8fafc' }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={() => {
          selectDevice(null);
          selectConnection(null);
        }}
      >
        <Layer>
          {Array.from({ length: Math.ceil(width / 30) }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * 30, 0, i * 30, height]}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(height / 30) }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * 30, width, i * 30]}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          ))}
        </Layer>
        <Layer>
          {connections.map((conn) => {
            const from = devices.find((d) => d.id === conn.fromDeviceId);
            const to = devices.find((d) => d.id === conn.toDeviceId);
            if (!from || !to) return null;
            const isSel = selectedConnectionId === conn.id;
            return (
              <Group key={conn.id}>
                <Line
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={isSel ? '#2563eb' : '#64748b'}
                  strokeWidth={isSel ? 3.5 : 2}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={12}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    selectConnection(conn.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    selectConnection(conn.id);
                  }}
                  dash={isSel ? [8, 4] : undefined}
                />
                <Circle
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2}
                  radius={isSel ? 7 : 5}
                  fill={isSel ? '#2563eb' : '#94a3b8'}
                  stroke="#fff"
                  strokeWidth={2}
                />
              </Group>
            );
          })}
          {fromDevice && draggingLineEnd && (
            <Arrow
              points={[fromDevice.x, fromDevice.y, draggingLineEnd.x, draggingLineEnd.y]}
              stroke="#3b82f6"
              strokeWidth={2.5}
              dash={[6, 4]}
              pointerLength={10}
              pointerWidth={8}
              opacity={0.8}
            />
          )}
        </Layer>
        <Layer>
          {devices.map((device) => (
            <DeviceNode
              key={device.id}
              device={device}
              isSelected={selectedDeviceId === device.id}
              isSource={sourceDeviceId === device.id}
              isTarget={targetDeviceId === device.id}
              onSelect={() => handleDeviceSelect(device)}
              onDoubleClick={() => openConfigPanel(device.id)}
              onDragStart={() => selectDevice(device.id)}
              onDragMove={(x, y) => updateDevicePosition(device.id, x, y)}
              onPortMouseDown={() => handlePortMouseDown(device.id)}
            />
          ))}
          {isDraggingNewConnection && dragFromDevice && devices.map((device) =>
            device.id !== dragFromDevice ? (
              <Circle
                key={`target-${device.id}`}
                x={device.x}
                y={device.y}
                radius={DEVICE_RADIUS + 10}
                stroke="#22c55e"
                strokeWidth={2}
                dash={[4, 4]}
                opacity={0.6}
                onMouseUp={() => {
                  addConnection(dragFromDevice, device.id);
                  stopDraggingConnection();
                  setDraggingLineEnd(null);
                  setDragFromDevice(null);
                }}
              />
            ) : null
          )}
        </Layer>
      </Stage>
    </div>
  );
};
