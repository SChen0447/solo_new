import type { BattleLogEntry } from '../../types';
import './BattleSimulator.css';

interface BattleLogProps {
  logs: BattleLogEntry[];
}

const BattleLog = ({ logs }: BattleLogProps) => {
  return (
    <div className="battle-log">
      <h3>战斗日志</h3>
      <div className="log-container">
        {logs.length === 0 ? (
          <p className="empty-log">等待战斗开始...</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`log-entry log-${log.type}`}
            >
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BattleLog;
