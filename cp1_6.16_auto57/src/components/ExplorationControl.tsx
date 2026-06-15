import { useDungeonStore } from '../store';
import type { SimulationSpeed } from '../store';
import './ExplorationControl.css';

const MAX_FLOOR = 20;

export default function ExplorationControl() {
  const {
    currentFloor,
    simulationStatus,
    simulationSpeed,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
  } = useDungeonStore();

  const progress = Math.min(((currentFloor - 1) / MAX_FLOOR) * 100, 100);
  const isRunning = simulationStatus === 'running';
  const isFinished = simulationStatus === 'finished';

  const handleStartPause = () => {
    if (isRunning) {
      pauseSimulation();
    } else {
      startSimulation();
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSimulationSpeed(Number(e.target.value) as SimulationSpeed);
  };

  return (
    <div className="exploration-control">
      <div className="progress-container">
        <div className="progress-label">
          <span>地牢深度</span>
          <span>
            第 {Math.min(currentFloor, MAX_FLOOR)} 层 / {MAX_FLOOR} 层
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${isRunning ? 'animated' : ''}`}
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #2ECC71, #E74C3C)',
            }}
          />
        </div>
      </div>

      <div className="control-buttons">
        <button
          className={`control-btn start-btn ${isRunning ? 'pause' : ''}`}
          onClick={handleStartPause}
          disabled={isFinished}
        >
          {isRunning ? '⏸ 暂停' : '▶ 开始探索'}
        </button>
        <button
          className="control-btn reset-btn"
          onClick={resetSimulation}
          disabled={currentFloor === 1 && simulationStatus === 'idle'}
        >
          🔄 重置
        </button>

        <div className="speed-selector">
          <label htmlFor="speed-select">速度:</label>
          <select
            id="speed-select"
            value={simulationSpeed}
            onChange={handleSpeedChange}
            className="speed-select"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
