import React, { useRef, useEffect, useCallback } from 'react';
import { SimulationEngine } from './SimulationEngine';
import { MaterialMixer } from './MaterialMixer';
import { useSimulationStore } from '../store/useSimulationStore';
import type { Particle, EnergyData } from '../types';

interface SimulationPanelProps {
  energyData: EnergyData | null;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ energyData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const lastChartUpdateRef = useRef<number>(0);
  const {
    isSimulating,
    currentEnergyData,
    addChartData,
    setCurrentFrame,
    stopSimulation,
    addHistoryRecord,
    fireAmount,
    waterAmount
  } = useSimulationStore();

  const handleFrame = useCallback((_particles: Particle[], frame: number) => {
    setCurrentFrame(frame);

    const now = performance.now();
    if (now - lastChartUpdateRef.current >= 66 && currentEnergyData) {
      lastChartUpdateRef.current = now;
      const values = MaterialMixer.getChartValueAtFrame(currentEnergyData, frame);
      addChartData({
        frame,
        ...values
      });
    }
  }, [currentEnergyData, addChartData, setCurrentFrame]);

  const handleComplete = useCallback(() => {
    if (currentEnergyData) {
      const totalScore = MaterialMixer.calculateTotalScore(currentEnergyData);
      addHistoryRecord({
        fireRatio: fireAmount,
        waterRatio: waterAmount,
        energyType: currentEnergyData.type,
        totalScore,
        energyData: currentEnergyData
      });
    }
    stopSimulation();
  }, [currentEnergyData, addHistoryRecord, stopSimulation, fireAmount, waterAmount]);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new SimulationEngine(canvasRef.current, {
        onFrame: handleFrame,
        onComplete: handleComplete
      });
    }

    const handleResize = () => {
      engineRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engineRef.current?.stop();
    };
  }, [handleFrame, handleComplete]);

  useEffect(() => {
    if (isSimulating && energyData && engineRef.current) {
      lastChartUpdateRef.current = 0;
      engineRef.current.start(energyData);
    }
  }, [isSimulating, energyData]);

  useEffect(() => {
    if (!isSimulating && engineRef.current) {
      engineRef.current.clear();
    }
  }, [isSimulating]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        minWidth: '800px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 100%)',
        border: '2px solid rgba(255, 107, 53, 0.3)',
        boxShadow: '0 0 40px rgba(255, 107, 53, 0.2)'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      {!isSimulating && !energyData && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '16px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚗️</div>
          <div>调整材料配比，点击"开始混合"</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255, 255, 255, 0.3)' }}>
            观察能量释放的神奇效果
          </div>
        </div>
      )}
      {energyData && !isSimulating && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff'
          }}
        >
          <div style={{ color: '#ff6b35', fontWeight: 'bold', marginBottom: '4px' }}>
            能量类型: {
              { explosion: '💥 爆炸', jet: '💧 喷射', pillar: '✨ 光柱', shockwave: '🌊 冲击波' }[energyData.type]
            }
          </div>
          <div>强度: {(energyData.intensity * 100).toFixed(1)}%</div>
          <div>半径: {(energyData.radius * 100).toFixed(1)}%</div>
          <div>持续: {(energyData.duration * 100).toFixed(1)}%</div>
          <div>粒子数: {energyData.particleCount}</div>
        </div>
      )}
    </div>
  );
};
