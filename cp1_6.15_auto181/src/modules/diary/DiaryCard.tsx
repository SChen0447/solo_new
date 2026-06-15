import { useState } from 'react';
import { usePlantStore } from '../../stores/plantStore';
import type { CareEntry } from '../../types';
import { CARE_TYPE_LABELS, CARE_TYPE_COLORS } from '../../types';

interface DiaryCardProps {
  entry: CareEntry;
  isNew?: boolean;
}

const PLANT_ICONS: Record<string, string> = {
  watering: '💧',
  fertilizing: '🌿',
  pruning: '✂️',
  repotting: '🪴',
  sun_protection: '⛱️'
};

export default function DiaryCard({ entry, isNew = false }: DiaryCardProps) {
  const { updateEntry, deleteEntry } = usePlantStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(entry.note);
  const [editType, setEditType] = useState(entry.type);
  const [editDate, setEditDate] = useState(entry.date);
  const [editPlantName, setEditPlantName] = useState(entry.plantName);

  const handleSave = () => {
    updateEntry(entry.id, {
      plantName: editPlantName,
      type: editType,
      date: editDate,
      note: editNote
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className="fade-in"
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid #1976d2',
          borderRadius: 8,
          padding: 16,
          transition: 'all 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={editPlantName}
            onChange={(e) => setEditPlantName(e.target.value)}
            placeholder="植物名称（字母+汉字，2-20字符）"
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #444',
              backgroundColor: '#2a2a2a',
              color: '#e0e0e0',
              fontSize: 14
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #444',
                backgroundColor: '#2a2a2a',
                color: '#e0e0e0',
                fontSize: 14
              }}
            >
              {Object.entries(CARE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #444',
                backgroundColor: '#2a2a2a',
                color: '#e0e0e0',
                fontSize: 14
              }}
            />
          </div>
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value.slice(0, 100))}
            placeholder="备注（最多100字）"
            rows={2}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #444',
              backgroundColor: '#2a2a2a',
              color: '#e0e0e0',
              fontSize: 14,
              resize: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                backgroundColor: '#444',
                color: '#e0e0e0',
                fontSize: 13
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                backgroundColor: '#1976d2',
                color: '#fff',
                fontSize: 13
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={isNew ? 'fade-in' : ''}
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        gap: 12,
        transition: 'all 0.2s ease-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#333';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: CARE_TYPE_COLORS[entry.type] + '30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0
        }}
      >
        {PLANT_ICONS[entry.type]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#e0e0e0'
            }}
          >
            {entry.plantName}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              backgroundColor: CARE_TYPE_COLORS[entry.type],
              color: entry.type === 'sun_protection' ? '#333' : '#fff',
              fontWeight: 500
            }}
          >
            {CARE_TYPE_LABELS[entry.type]}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#888',
            marginBottom: entry.note ? 6 : 0
          }}
        >
          📅 {entry.date}
        </div>
        {entry.note && (
          <div
            style={{
              fontSize: 13,
              color: '#b0b0b0',
              lineHeight: 1.5
            }}
          >
            {entry.note}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: '#1976d2',
            fontSize: 12,
            border: '1px solid #1976d250'
          }}
        >
          编辑
        </button>
        <button
          onClick={() => {
            if (confirm('确认删除这条记录？')) {
              deleteEntry(entry.id);
            }
          }}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: '#d32f2f',
            fontSize: 12,
            border: '1px solid #d32f2f50'
          }}
        >
          删除
        </button>
      </div>
    </div>
  );
}
