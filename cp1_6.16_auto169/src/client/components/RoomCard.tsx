import { useNavigate } from 'react-router-dom';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
}

const statusText: Record<string, string> = {
  waiting: '等待中',
  debating: '辩论中',
  voting: '投票中',
  finished: '已结束',
};

const statusColor: Record<string, string> = {
  waiting: '#4CAF50',
  debating: '#FF9800',
  voting: '#9C27B0',
  finished: '#757575',
};

const RoomCard = ({ room }: RoomCardProps) => {
  const navigate = useNavigate();
  const proCount = room.members.filter((m) => m.side === 'pro').length;
  const conCount = room.members.filter((m) => m.side === 'con').length;

  const handleClick = () => {
    navigate(`/room/${room.roomCode}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ color: '#1E88E5', fontSize: '18px', fontWeight: 500, margin: 0, flex: 1, marginRight: '10px' }}>
            {room.topic}
          </h3>
          <span
            style={{
              backgroundColor: statusColor[room.status],
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {statusText[room.status]}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <span style={{ color: '#1976D2' }}>●</span> {room.sides.pro}
          <span style={{ margin: '0 8px', color: '#999' }}>VS</span>
          <span style={{ color: '#D32F2F' }}>●</span> {room.sides.con}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: '#999' }}>
          房间码: <span style={{ fontFamily: 'monospace', color: '#1E88E5' }}>{room.roomCode}</span>
        </div>
        <div style={{ fontSize: '13px', color: '#999' }}>
          {proCount}人 vs {conCount}人
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
