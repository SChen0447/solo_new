import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../../../shared/types.js';
import { usePetStore } from '@/store/petStore';

type TaskCardProps = {
  task: Task;
  onComplete: (taskId: string) => void;
};

function CountdownTimer({ duration, speed }: { duration: number; speed: number }) {
  const [remaining, setRemaining] = useState(duration * 60);

  useEffect(() => {
    setRemaining(duration * 60);
  }, [duration]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - speed;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [speed]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <span>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

function ConfirmModal({
  taskName,
  onConfirm,
  onCancel,
}: {
  taskName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [closing, setClosing] = useState(false);

  const handleCancel = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onCancel();
    }, 300);
  }, [onCancel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#00000080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 360,
          borderRadius: 12,
          background: '#fff',
          padding: 24,
          transform: closing ? 'scale(0)' : 'scale(1)',
          transition: 'transform 0.3s',
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>{taskName}</h3>
        <p style={{ margin: 0, marginBottom: 20, color: '#666' }}>确认完成此任务?</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: 6,
              background: '#9E9E9E',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: 6,
              background: '#1976D2',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [showModal, setShowModal] = useState(false);
  const speed = usePetStore((s) => s.speed);

  const handleCardClick = useCallback(() => {
    if (!task.completed) {
      setShowModal(true);
    }
  }, [task.completed]);

  const handleConfirm = useCallback(() => {
    onComplete(task.id);
    setShowModal(false);
  }, [onComplete, task.id]);

  const handleCancel = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      <div
        onClick={handleCardClick}
        style={{
          background: task.completed ? '#E8F5E9' : '#FFF3E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8,
          padding: 16,
          cursor: task.completed ? 'default' : 'pointer',
          transition: 'transform 0.2s',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{task.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{task.name}</div>
            {!task.completed && (
              <CountdownTimer duration={task.duration} speed={speed} />
            )}
            {task.completed && (
              <span
                style={{
                  display: 'inline-block',
                  color: '#4CAF50',
                  fontWeight: 700,
                  fontSize: 18,
                  animation: 'checkmarkPop 0.4s ease forwards',
                }}
              >
                ✓
              </span>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <ConfirmModal
          taskName={task.name}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <style>{`
        @keyframes checkmarkPop {
          0% { transform: scale(0) rotate(0deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
      `}</style>
    </>
  );
}
