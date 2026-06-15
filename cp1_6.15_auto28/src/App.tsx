import React, { useState, useEffect } from 'react';
import { SimulationPanel } from './simulation/SimulationPanel';
import { ControlPanel } from './ui/ControlPanel';
import { EnergyChart } from './ui/EnergyChart';
import { HistoryPanel } from './ui/HistoryPanel';
import { MaterialMixer } from './simulation/MaterialMixer';
import { useSimulationStore } from './store/useSimulationStore';
import type { EnergyData } from './types';

const App: React.FC = () => {
  const { fireAmount, waterAmount, isSimulating, currentEnergyData, startSimulation } = useSimulationStore();
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [activeEnergyData, setActiveEnergyData] = useState<EnergyData | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setActiveEnergyData(currentEnergyData);
  }, [currentEnergyData]);

  const handleMix = () => {
    if (!isSimulating) {
      const energyData = MaterialMixer.calculateEnergy(fireAmount, waterAmount);
      setActiveEnergyData(energyData);
      startSimulation(energyData);
    }
  };

  const isMobile = viewportWidth < 1024;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box'
      }}
    >
      <header
        style={{
          textAlign: 'center',
          padding: '16px 0'
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            background: 'linear-gradient(135deg, #ff6b35 0%, #ff8533 50%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '4px'
          }}
        >
          ⚗️ 魔法材料融合与能量释放演示
        </h1>
        <p
          style={{
            margin: '8px 0 0 0',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '12px'
          }}
        >
          Magic Material Fusion & Energy Release Simulation
        </p>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
          minHeight: 0,
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center'
          }}
        >
          <SimulationPanel energyData={activeEnergyData} />
          <div style={{ width: '100%', minWidth: '800px' }}>
            <ControlPanel onMix={handleMix} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            minWidth: isMobile ? '800px' : '340px',
            width: isMobile ? '100%' : '340px'
          }}
        >
          <EnergyChart />
          <HistoryPanel />
        </div>
      </div>

      <footer
        style={{
          textAlign: 'center',
          padding: '12px 0',
          color: 'rgba(255, 255, 255, 0.3)',
          fontSize: '11px'
        }}
      >
        火焰结晶 🔥 + 水之精华 💧 = 神奇能量 ✨ | 基于 Canvas 2D 物理模拟引擎
      </footer>
    </div>
  );
};

export default App;
