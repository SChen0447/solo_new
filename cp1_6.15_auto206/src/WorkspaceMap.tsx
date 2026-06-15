import React, { useState, useEffect } from 'react';
import { useAppStore } from './store';
import type { Workspace } from './types';

const statusColors: Record<string, string> = {
  idle: '#c8e6c9',
  occupied: '#ffcc80',
  reserved: '#bbdefb',
  maintenance: '#e0e0e0',
};

const zoneLabels: Record<string, string> = {
  A: 'A区 - 靠窗',
  B: 'B区 - 中间',
  C: 'C区 - 靠门',
};

interface ReservationPanelProps {
  workspace: Workspace;
  onClose: () => void;
  onSubmit: (data: { date: string; startTime: string; duration: number; memberName: string }) => void;
  conflict: boolean;
}

const ReservationPanel: React.FC<ReservationPanelProps> = ({ workspace, onClose, onSubmit, conflict }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(1);
  const [memberName, setMemberName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    onSubmit({ date, startTime, duration, memberName: memberName.trim() });
  };

  return (
    <div className="reservation-overlay" onClick={onClose}>
      <div
        className={`reservation-panel ${conflict ? 'shake conflict' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>预约工位 {workspace.name}</h3>
        <p className="zone-label">{zoneLabels[workspace.zone]}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="form-group">
            <label>开始时间</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>时长: {duration}小时</label>
            <input
              type="range"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>1h</span>
              <span>8h</span>
            </div>
          </div>
          <div className="form-group">
            <label>使用人</label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="请输入使用人姓名"
            />
          </div>
          {conflict && <p className="error-text">该时段已被预约，请重新选择</p>}
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确认预约
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WorkspaceMap: React.FC = () => {
  const { workspaces, fetchWorkspaces, reserveWorkspace, loading } = useAppStore();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [conflict, setConflict] = useState(false);
  const [shakeWorkspace, setShakeWorkspace] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleWorkspaceClick = (ws: Workspace) => {
    if (ws.status !== 'idle') {
      setShakeWorkspace(ws.id);
      setTimeout(() => setShakeWorkspace(null), 300);
      return;
    }
    setSelectedWorkspace(ws);
    setConflict(false);
  };

  const handleReserve = async (data: { date: string; startTime: string; duration: number; memberName: string }) => {
    if (!selectedWorkspace) return;
    const result = await reserveWorkspace({
      workspaceId: selectedWorkspace.id,
      ...data,
    });
    if (result.success) {
      setSelectedWorkspace(null);
    } else {
      setConflict(true);
      setShakeWorkspace(selectedWorkspace.id);
      setTimeout(() => setShakeWorkspace(null), 300);
    }
  };

  const groupedWorkspaces = workspaces.reduce((acc, ws) => {
    if (!acc[ws.zone]) acc[ws.zone] = [];
    acc[ws.zone].push(ws);
    return acc;
  }, {} as Record<string, Workspace[]>);

  if (loading && workspaces.length === 0) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="workspace-map-container">
      <h2 className="page-title">工位地图</h2>
      <div className="status-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: statusColors.idle }}></span>
          <span>空闲</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: statusColors.occupied }}></span>
          <span>占用</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: statusColors.reserved }}></span>
          <span>预定</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: statusColors.maintenance }}></span>
          <span>维修</span>
        </div>
      </div>

      <div className="zones-container">
        {Object.entries(groupedWorkspaces).map(([zone, wsList]) => (
          <div key={zone} className="zone-card">
            <h3 className="zone-title">{zoneLabels[zone]}</h3>
            <div className="workspace-grid">
              {wsList.map((ws) => (
                <div
                  key={ws.id}
                  className={`workspace-block ${shakeWorkspace === ws.id ? 'shake' : ''}`}
                  style={{
                    backgroundColor: statusColors[ws.status],
                    cursor: ws.status === 'idle' ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => handleWorkspaceClick(ws)}
                >
                  <span className="workspace-name">{ws.name}</span>
                  <span className="workspace-status">{ws.status === 'idle' ? '空闲' : ws.status === 'occupied' ? '占用' : ws.status === 'reserved' ? '预定' : '维修'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedWorkspace && (
        <ReservationPanel
          workspace={selectedWorkspace}
          onClose={() => setSelectedWorkspace(null)}
          onSubmit={handleReserve}
          conflict={conflict}
        />
      )}
    </div>
  );
};

export default WorkspaceMap;
