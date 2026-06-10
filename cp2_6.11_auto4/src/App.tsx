import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CrystalNetwork from './CrystalNetwork';
import { CrystalData, ConnectionData, Frequency, FREQUENCY_CONFIG, generateId } from './types';

const panelStyles = (expanded: boolean, isMobile: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '20px',
  right: expanded ? '0' : '0',
  bottom: '20px',
  width: expanded ? '260px' : '6px',
  background: expanded ? 'rgba(20, 20, 40, 0.85)' : 'rgba(42, 42, 74, 0.6)',
  backdropFilter: expanded ? 'blur(12px)' : 'none',
  WebkitBackdropFilter: expanded ? 'blur(12px)' : 'none',
  borderRadius: expanded ? '12px 0 0 12px' : '3px 0 0 3px',
  padding: expanded ? '20px 16px' : '0',
  transition: 'width 0.3s ease, padding 0.3s ease, background 0.3s ease, border-radius 0.3s ease, transform 0.3s ease',
  overflow: 'hidden',
  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  zIndex: 100,
  cursor: expanded ? 'default' : 'pointer',
  transform: isMobile && !expanded ? 'translateX(0)' : 'translateX(0)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: expanded ? 'flex-start' : 'center',
  alignItems: expanded ? 'stretch' : 'center'
});

const App: React.FC = () => {
  const [crystals, setCrystals] = useState<CrystalData[]>([
    {
      id: 'default-mid',
      position: [0, 0, 0],
      frequency: 'mid',
      color: FREQUENCY_CONFIG.mid.color
    }
  ]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [selectedCrystalId, setSelectedCrystalId] = useState<string | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(!isMobile);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsToolbarExpanded(false);
        setIsPanelExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addCrystal = useCallback((position: [number, number, number], frequency: Frequency = 'mid') => {
    const newCrystal: CrystalData = {
      id: generateId(),
      position,
      frequency,
      color: FREQUENCY_CONFIG[frequency].color
    };
    setCrystals(prev => [...prev, newCrystal]);
  }, []);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setConnections(prev => {
      const exists = prev.some(
        c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
      );
      if (exists) return prev;
      return [...prev, { id: generateId(), from: fromId, to: toId }];
    });
  }, []);

  const clearAll = useCallback(() => {
    setCrystals([]);
    setConnections([]);
    setSelectedCrystalId(null);
  }, []);

  const generateRandomNetwork = useCallback(() => {
    const newCrystals: CrystalData[] = [];
    const frequencies: Frequency[] = ['low', 'mid', 'high'];
    const count = 8 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const freq = frequencies[Math.floor(Math.random() * 3)];
      newCrystals.push({
        id: generateId(),
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 8
        ],
        frequency: freq,
        color: FREQUENCY_CONFIG[freq].color
      });
    }

    const newConnections: ConnectionData[] = [];
    for (let i = 0; i < newCrystals.length; i++) {
      const connectCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < connectCount; j++) {
        const target = Math.floor(Math.random() * newCrystals.length);
        if (target !== i) {
          const exists = newConnections.some(
            c => (c.from === newCrystals[i].id && c.to === newCrystals[target].id) ||
                 (c.from === newCrystals[target].id && c.to === newCrystals[i].id)
          );
          if (!exists) {
            newConnections.push({
              id: generateId(),
              from: newCrystals[i].id,
              to: newCrystals[target].id
            });
          }
        }
      }
    }

    setCrystals(newCrystals);
    setConnections(newConnections);
    setSelectedCrystalId(null);
  }, []);

  const selectedCrystal = crystals.find(c => c.id === selectedCrystalId) || null;

  const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    background: '#2a2a4a',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease-out',
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #0d0d2b 0%, #0b0015 100%)' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#0d0d2b'), 1);
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#6b4eff" />
        <CrystalNetwork
          crystals={crystals}
          connections={connections}
          onAddCrystal={addCrystal}
          onAddConnection={addConnection}
          onSelectCrystal={setSelectedCrystalId}
          selectedCrystalId={selectedCrystalId}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: isMobile ? 'auto' : '20px',
          bottom: isMobile ? '20px' : 'auto',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: isToolbarExpanded || !isMobile ? '12px 16px' : '8px',
          display: 'flex',
          flexDirection: isToolbarExpanded || !isMobile ? 'column' : 'row',
          gap: '10px',
          transition: 'all 0.3s ease',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 100,
          transform: isMobile && !isToolbarExpanded ? 'translateX(0)' : 'translateX(0)'
        }}
      >
        {isMobile && !isToolbarExpanded ? (
          <button
            onClick={() => setIsToolbarExpanded(true)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#2a2a4a',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ⚙
          </button>
        ) : (
          <>
            <button
              onClick={clearAll}
              style={btnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a6a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a4a'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              清除所有晶体
            </button>
            <button
              onClick={generateRandomNetwork}
              style={btnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a6a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a4a'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              生成随机网络
            </button>
            {isMobile && (
              <button
                onClick={() => setIsToolbarExpanded(false)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                收起
              </button>
            )}
          </>
        )}
      </div>

      <div
        style={panelStyles(isPanelExpanded, isMobile)}
        onClick={() => {
          if (!isPanelExpanded) setIsPanelExpanded(true);
        }}
      >
        {!isPanelExpanded && (
          <div
            style={{
              width: '4px',
              height: '40px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.3)',
              alignSelf: 'center'
            }}
          />
        )}

        {isPanelExpanded && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>晶体信息</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPanelExpanded(false);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                ▸
              </button>
            </div>
            {selectedCrystal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>频率</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedCrystal.frequency === 'low' ? '低频' : selectedCrystal.frequency === 'mid' ? '中频' : '高频'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>颜色</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: selectedCrystal.color, boxShadow: `0 0 12px ${selectedCrystal.color}` }} />
                    <span style={{ fontFamily: 'monospace' }}>{selectedCrystal.color.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>连接数</div>
                  <div style={{ fontWeight: 600 }}>
                    {connections.filter(c => c.from === selectedCrystal.id || c.to === selectedCrystal.id).length}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>坐标</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    ({selectedCrystal.position[0].toFixed(2)}, {selectedCrystal.position[1].toFixed(2)}, {selectedCrystal.position[2].toFixed(2)})
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.6 }}>
                点击晶体查看详细信息<br /><br />
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>操作提示：</strong><br />
                • 双击空白创建晶体<br />
                • 从晶体拖拽到另一晶体建立连接
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
