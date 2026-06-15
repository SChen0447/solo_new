import { useEffect, useRef } from 'react';
import TrafficScene from '@components/TrafficScene';
import UIPanel from '@components/UIPanel';
import { TrafficSimulator } from '@traffic/TrafficSimulator';
import { useTrafficStore, type TrafficPacket } from '@store/useTrafficStore';
import './styles.css';

function App() {
  const addData = useTrafficStore((s) => s.addData);
  const simulatorRef = useRef<TrafficSimulator | null>(null);
  const isPaused = useTrafficStore((s) => s.isPaused);

  useEffect(() => {
    const simulator = new TrafficSimulator((packets: TrafficPacket[]) => {
      addData(packets);
    });
    simulatorRef.current = simulator;
    simulator.start(100);

    return () => {
      simulator.stop();
      simulatorRef.current = null;
    };
  }, [addData]);

  useEffect(() => {
    const handleReset = () => {
      const event = new CustomEvent('cameraResetInternal');
      window.dispatchEvent(event);
    };
    window.addEventListener('resetCamera', handleReset);
    return () => window.removeEventListener('resetCamera', handleReset);
  }, []);

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="logo">
          <div className="logo-icon" />
          <span className="logo-text">
            网络流量<span style={{ color: '#7c4dff' }}>3D</span>可视化分析
          </span>
        </div>
        <div className="header-status">
          <span className={`status-dot ${isPaused ? 'paused' : 'running'}`} />
          <span className="status-text">
            {isPaused ? '已暂停' : '运行中'}
          </span>
        </div>
      </div>

      <div className="app-main">
        <UIPanel />
        <div className="scene-container">
          <TrafficScene />
        </div>
      </div>
    </div>
  );
}

export default App;
