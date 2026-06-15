import { useRef, useEffect } from 'react';
import { useNetworkStore } from '../store/useNetworkStore';
import {
  PIPE_NAMES,
  PIPE_COLORS,
  SENSOR_NAMES,
} from '../types';

export function InfoPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedNodeId = useNetworkStore((state) => state.selectedNodeId);
  const selectedPipeId = useNetworkStore((state) => state.selectedPipeId);
  const getNodeById = useNetworkStore((state) => state.getNodeById);
  const getPipeById = useNetworkStore((state) => state.getPipeById);
  const nodes = useNetworkStore((state) => state.nodes);

  const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const selectedPipe = selectedPipeId ? getPipeById(selectedPipeId) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 150 * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, rect.width, 150);

    if (selectedNode) {
      const history = selectedNode.sensor.history;
      if (history.length > 0) {
        const minVal = Math.min(...history) * 0.95;
        const maxVal = Math.max(...history) * 1.05;
        const padding = { left: 40, right: 20, top: 20, bottom: 30 };
        const chartWidth = rect.width - padding.left - padding.right;
        const chartHeight = 150 - padding.top - padding.bottom;

        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (chartHeight / 4) * i;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(rect.width - padding.right, y);
          ctx.stroke();
        }

        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const points = history.map((val, idx) => {
          const x = padding.left + (chartWidth / (history.length - 1)) * idx;
          const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
          return { x, y };
        });

        points.forEach((point, idx) => {
          if (idx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();

        ctx.fillStyle = '#00bcd4';
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (chartHeight / 4) * i;
          const val = maxVal - ((maxVal - minVal) / 4) * i;
          ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
        }

        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('时间', rect.width / 2, 150 - 8);
      }
    }
  }, [selectedNode, nodes]);

  const renderPipeInfo = () => {
    if (!selectedPipe) return null;

    const startNode = getNodeById(selectedPipe.startNodeId);
    const endNode = getNodeById(selectedPipe.endNodeId);
    const color = PIPE_COLORS[selectedPipe.type];
    const name = PIPE_NAMES[selectedPipe.type];
    const depth = startNode && endNode
      ? (startNode.y + endNode.y) / 2
      : 0;

    return (
      <div>
        <div style={headerStyle}>
          <div
            style={{
              ...colorIndicatorStyle,
              backgroundColor: color,
            }}
          />
          <span style={titleStyle}>管段详情</span>
        </div>
        <div style={dividerStyle} />
        <div style={infoRowStyle}>
          <span style={labelStyle}>管段名称</span>
          <span style={valueStyle}>{name}管线-{selectedPipe.id.slice(0, 8)}</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>管线类型</span>
          <span style={{ ...valueStyle, color }}>{name}</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>材质</span>
          <span style={valueStyle}>{selectedPipe.material}</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>管径</span>
          <span style={valueStyle}>{(selectedPipe.diameter * 100).toFixed(0)}cm</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>平均埋深</span>
          <span style={valueStyle}>{depth.toFixed(1)}m</span>
        </div>
        {startNode && (
          <div style={infoRowStyle}>
            <span style={labelStyle}>起点坐标</span>
            <span style={valueStyle}>
              ({startNode.x.toFixed(1)}, {startNode.z.toFixed(1)})
            </span>
          </div>
        )}
        {endNode && (
          <div style={infoRowStyle}>
            <span style={labelStyle}>终点坐标</span>
            <span style={valueStyle}>
              ({endNode.x.toFixed(1)}, {endNode.z.toFixed(1)})
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderSensorInfo = () => {
    if (!selectedNode) return null;

    const sensor = selectedNode.sensor;
    const sensorName = SENSOR_NAMES[sensor.type];

    return (
      <div>
        <div style={headerStyle}>
          <div
            style={{
              ...colorIndicatorStyle,
              backgroundColor: '#29b6f6',
            }}
          />
          <span style={titleStyle}>传感器详情</span>
        </div>
        <div style={dividerStyle} />
        <div style={infoRowStyle}>
          <span style={labelStyle}>传感器名称</span>
          <span style={valueStyle}>{sensorName}传感器</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>类型</span>
          <span style={valueStyle}>{sensorName}</span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>当前值</span>
          <span style={{ ...valueStyle, color: '#29b6f6', fontSize: '20px', fontWeight: 600 }}>
            {sensor.value.toFixed(2)} {sensor.unit}
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>节点坐标</span>
          <span style={valueStyle}>
            ({selectedNode.x.toFixed(1)}, {selectedNode.y.toFixed(1)}, {selectedNode.z.toFixed(1)})
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>埋深</span>
          <span style={valueStyle}>{Math.abs(selectedNode.y).toFixed(1)}m</span>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={headerStyle}>
            <span style={{ ...titleStyle, fontSize: '14px' }}>历史数据</span>
          </div>
          <div style={dividerStyle} />
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '150px',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    );
  };

  const renderEmpty = () => (
    <div style={emptyContainerStyle}>
      <div style={emptyIconStyle}>📊</div>
      <div style={emptyTextStyle}>点击管段或传感器节点查看详情</div>
    </div>
  );

  return (
    <div style={panelStyle}>
      <div style={contentStyle}>
        {selectedPipe && renderPipeInfo()}
        {selectedNode && renderSensorInfo()}
        {!selectedPipe && !selectedNode && renderEmpty()}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '320px',
  maxHeight: 'calc(100vh - 40px)',
  background: 'rgba(13, 27, 42, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '8px',
  border: '1px solid rgba(41, 182, 246, 0.3)',
  color: '#e0e0e0',
  overflowY: 'auto',
  zIndex: 100,
};

const contentStyle: React.CSSProperties = {
  padding: '20px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
};

const colorIndicatorStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '3px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#e0e0e0',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'rgba(41, 182, 246, 0.3)',
  margin: '12px 0',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8899aa',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#e0e0e0',
  textAlign: 'right',
  maxWidth: '180px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const emptyContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '300px',
  color: '#667788',
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px',
  opacity: 0.5,
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: '14px',
  textAlign: 'center',
};
