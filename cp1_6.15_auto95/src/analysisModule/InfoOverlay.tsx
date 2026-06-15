import React, { useState, useEffect } from 'react';
import { useJointStore, JOINT_NAMES, JOINT_LABELS, JointName } from '../jointModule/JointController';

const CoordinatePanel: React.FC = () => {
  const { endEffectorPosition } = useJointStore();
  const [displayPos, setDisplayPos] = useState({ x: 0, y: 0, z: 0 });
  const lastUpdateRef = React.useRef(0);

  useEffect(() => {
    const now = performance.now();
    if (now - lastUpdateRef.current >= 50) {
      setDisplayPos(endEffectorPosition);
      lastUpdateRef.current = now;
    }
  }, [endEffectorPosition]);

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    left: 20,
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 12,
    minWidth: 180,
    zIndex: 10,
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const titleStyle: React.CSSProperties = {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
    borderBottom: '1px solid #3a3a5e',
    paddingBottom: 6
  };

  const coordStyle = (color: string): React.CSSProperties => ({
    fontSize: 14,
    fontFamily: 'monospace',
    margin: '4px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });

  const labelStyle = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 700,
    width: 24
  });

  const valueStyle = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 500
  });

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>末端坐标</div>
      <div style={coordStyle('#ff4d4d')}>
        <span style={labelStyle('#ff4d4d')}>X:</span>
        <span style={valueStyle('#ff4d4d')}>{displayPos.x.toFixed(2)}</span>
      </div>
      <div style={coordStyle('#4dff4d')}>
        <span style={labelStyle('#4dff4d')}>Y:</span>
        <span style={valueStyle('#4dff4d')}>{displayPos.y.toFixed(2)}</span>
      </div>
      <div style={coordStyle('#4d4dff')}>
        <span style={labelStyle('#4d4dff')}>Z:</span>
        <span style={valueStyle('#4d4dff')}>{displayPos.z.toFixed(2)}</span>
      </div>
    </div>
  );
};

interface JointSliderProps {
  joint: JointName;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const JointSlider: React.FC<JointSliderProps> = ({ joint, value, onChange, disabled }) => {
  const [dragging, setDragging] = useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onChange(percentage * 180);
  };

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setDragging(true);
  };

  React.useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      onChange(percentage * 180);
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onChange]);

  const percentage = (value / 180) * 100;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    opacity: disabled ? 0.5 : 1
  };

  const valueLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#ddd',
    fontFamily: 'monospace',
    fontWeight: 600,
    minWidth: 48,
    textAlign: 'center'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#a0a0c0',
    fontWeight: 500
  };

  const trackStyle: React.CSSProperties = {
    width: 200,
    height: 16,
    background: '#2a2a3a',
    borderRadius: 8,
    position: 'relative',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)'
  };

  const fillStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${percentage}%`,
    background: 'linear-gradient(90deg, #ff6b00, #ff8c00)',
    borderRadius: 8,
    transition: dragging ? 'none' : 'width 0.1s ease-out'
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: `calc(${percentage}% - 7px)`,
    transform: 'translateY(-50%)',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#ff8c00',
    cursor: disabled ? 'not-allowed' : 'grab',
    boxShadow: dragging
      ? '0 0 0 4px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)'
      : '0 0 0 2px #ffffff, 0 2px 6px rgba(0, 0, 0, 0.3)',
    transition: dragging ? 'none' : 'all 0.1s ease-out',
    zIndex: 2
  };

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>{JOINT_LABELS[joint]}</div>
      <div style={valueLabelStyle}>{value.toFixed(1)}°</div>
      <div
        ref={trackRef}
        style={trackStyle}
        onClick={handleTrackClick}
      >
        <div style={fillStyle} />
        <div
          style={thumbStyle}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
    </div>
  );
};

interface ControlPanelProps {
  isMobile?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ isMobile = false }) => {
  const {
    jointAngles,
    setJointAngle,
    isRecording,
    startRecording,
    stopRecording,
    clearTrail,
    targetCube,
    animation,
    toggleTargetCube,
    startAnimation,
    trailPoints
  } = useJointStore();

  const [buttonScale, setButtonScale] = useState<Record<string, number>>({});

  const handleButtonClick = (id: string, callback: () => void) => {
    setButtonScale(prev => ({ ...prev, [id]: 0.95 }));
    callback();
    setTimeout(() => {
      setButtonScale(prev => ({ ...prev, [id]: 1 }));
    }, 100);
  };

  const buttonBaseStyle: React.CSSProperties = {
    border: 'none',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'all 0.15s ease-out',
    transform: `scale(${buttonScale['record'] ?? 1})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const recordButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    width: 120,
    height: 36,
    background: isRecording ? '#dc3545' : '#007bff',
    transform: `scale(${buttonScale['record'] ?? 1})`
  };

  const clearButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    width: 120,
    height: 36,
    background: '#6c757d',
    transform: `scale(${buttonScale['clear'] ?? 1})`
  };

  const suctionButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    width: 100,
    height: 36,
    background: animation.isMoving ? '#6c757d' : '#28a745',
    cursor: animation.isMoving || !targetCube.selected ? 'not-allowed' : 'pointer',
    opacity: animation.isMoving || !targetCube.selected ? 0.6 : 1,
    transform: `scale(${buttonScale['suction'] ?? 1})`
  };

  const spawnButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    width: 140,
    height: 36,
    background: '#17a2b8',
    transform: `scale(${buttonScale['spawn'] ?? 1})`
  };

  const handleSuction = () => {
    if (animation.isMoving || !targetCube.selected || !targetCube.visible) return;

    const targetPos = targetCube.position;
    const armLength1 = 1.0;
    const armLength2 = 1.0;
    const d = Math.sqrt(
      targetPos[0] * targetPos[0] + targetPos[2] * targetPos[2]
    );
    const baseAngle = (Math.atan2(targetPos[0], targetPos[2]) * 180) / Math.PI + 90;
    const y = targetPos[1] - 0.3;

    const flatDist = Math.max(0.1, Math.min(d, armLength1 + armLength2 - 0.1));
    const heightDiff = y;

    const elbowAngleRad = Math.acos(
      Math.max(-1, Math.min(1,
        (flatDist * flatDist + heightDiff * heightDiff - armLength1 * armLength1 - armLength2 * armLength2) /
        (2 * armLength1 * armLength2)
      ))
    );
    const elbowAngle = 180 - (elbowAngleRad * 180) / Math.PI;

    const shoulderAngleRad =
      Math.atan2(heightDiff, flatDist) +
      Math.acos(
        Math.max(-1, Math.min(1,
          (armLength1 * armLength1 + flatDist * flatDist + heightDiff * heightDiff - armLength2 * armLength2) /
          (2 * armLength1 * Math.sqrt(flatDist * flatDist + heightDiff * heightDiff))
        ))
      );
    const shoulderAngle = (shoulderAngleRad * 180) / Math.PI + 45;

    const distance = Math.sqrt(
      Math.pow(targetPos[0] - jointAngles.base, 2) +
      Math.pow(targetPos[1], 2) +
      Math.pow(targetPos[2], 2)
    );
    const duration = Math.max(0.5, distance / 2);

    startAnimation(
      {
        base: Math.max(0, Math.min(180, baseAngle)),
        shoulder: Math.max(0, Math.min(180, shoulderAngle)),
        elbow: Math.max(0, Math.min(180, elbowAngle)),
        wrist1: 90,
        wrist2: 0,
        wrist3: 0
      },
      duration
    );
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1a1a2e',
        borderTop: '2px solid #2a2a4e',
        padding: 16,
        zIndex: 20,
        maxHeight: '45vh',
        overflowY: 'auto' as const
      }
    : {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '30%',
        minWidth: 340,
        background: '#1a1a2e',
        borderLeft: '2px solid #2a2a4e',
        padding: 20,
        zIndex: 20,
        overflowY: 'auto' as const
      };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 16,
    color: '#e0e0e0',
    fontWeight: 600,
    paddingBottom: 8,
    borderBottom: '2px solid #3a3a5e',
    marginBottom: 16
  };

  const gridStyle: React.CSSProperties = isMobile
    ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        padding: 12,
        border: '1px solid #2a2a4e',
        borderRadius: 8,
        marginBottom: 20
      }
    : {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 16,
        padding: 16,
        border: '1px solid #2a2a4e',
        borderRadius: 8,
        marginBottom: 20
      };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8
  };

  const statusStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#a0a0c0',
    marginTop: 8,
    fontFamily: 'monospace'
  };

  const recordingDotStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: isRecording ? '#dc3545' : '#28a745',
    marginRight: 6,
    animation: isRecording ? 'pulse 1s infinite' : 'none'
  };

  return (
    <div style={panelStyle}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>

      <div style={sectionTitleStyle}>关节控制</div>
      <div style={gridStyle}>
        {JOINT_NAMES.map(joint => (
          <JointSlider
            key={joint}
            joint={joint}
            value={jointAngles[joint]}
            onChange={(val) => setJointAngle(joint, val)}
            disabled={animation.isMoving}
          />
        ))}
      </div>

      <div style={sectionTitleStyle}>轨迹记录</div>
      <div style={buttonRowStyle}>
        <button
          style={recordButtonStyle}
          onClick={() => handleButtonClick('record', isRecording ? stopRecording : startRecording)}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          {isRecording ? '停止记录' : '开始记录'}
        </button>
        <button
          style={clearButtonStyle}
          onClick={() => handleButtonClick('clear', clearTrail)}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          清空轨迹
        </button>
      </div>
      <div style={statusStyle}>
        <span style={recordingDotStyle} />
        {isRecording ? '正在记录轨迹...' : '记录已停止'}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        轨迹点: {trailPoints.length}
      </div>

      <div style={{ ...sectionTitleStyle, marginTop: 20 }}>目标吸附</div>
      <div style={buttonRowStyle}>
        <button
          style={suctionButtonStyle}
          onClick={() => handleButtonClick('suction', handleSuction)}
          onMouseEnter={(e) => !animation.isMoving && targetCube.selected && (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          disabled={animation.isMoving || !targetCube.selected}
        >
          {animation.isMoving ? '移动中...' : '吸附'}
        </button>
        <button
          style={spawnButtonStyle}
          onClick={() => handleButtonClick('spawn', () => {
            toggleTargetCube(true);
          })}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          重新放置目标
        </button>
      </div>
      <div style={statusStyle}>
        <span style={{ color: targetCube.selected ? '#ffff00' : '#6c757d' }}>
          ●
        </span>
        &nbsp;
        {targetCube.selected
          ? '目标已选中，可点击吸附'
          : targetCube.visible
          ? '点击场景中的立方体选中'
          : '目标已被吸附'}
      </div>
    </div>
  );
};

export { CoordinatePanel, ControlPanel, JointSlider };
export default CoordinatePanel;
