import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import StickyNote from './components/StickyNote';
import VotePanel from './components/VotePanel';
import { appReducer, initialState } from './store/reducer';
import { Note, NOTE_SIZE, MERGE_DISTANCE } from './types';
import wsManager from './utils/websocket';
import { generateReport, downloadReport } from './utils/exportReport';

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [nearbyNoteId, setNearbyNoteId] = useState<string | null>(null);
  const [shakingNoteId, setShakingNoteId] = useState<string | null>(null);
  const [mergeDialog, setMergeDialog] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [meetingId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    wsManager.connect(wsUrl);

    const handleInit = (payload: { clientId: string; notes: Note[] }) => {
      dispatch({ type: 'INIT', payload });
      dispatch({ type: 'SET_CONNECTED', payload: true });
    };

    const handleNoteAdded = (payload: Note) => {
      dispatch({ type: 'NOTE_ADDED', payload });
    };

    const handleNoteMoved = (payload: { id: string; x: number; y: number }) => {
      dispatch({ type: 'NOTE_MOVED', payload });
    };

    const handleNoteUpdated = (payload: { id: string; text?: string; color?: string }) => {
      dispatch({ type: 'NOTE_UPDATED', payload });
    };

    const handleNoteDeleted = (payload: { id: string }) => {
      dispatch({ type: 'NOTE_DELETED', payload });
    };

    const handleVoteUpdated = (payload: {
      noteId: string;
      upvotes: number;
      downvotes: number;
      voterId: string;
      voteType: 'up' | 'down' | null;
    }) => {
      dispatch({ type: 'VOTE_UPDATED', payload });
    };

    const handleNotesMerged = (payload: {
      sourceId: string;
      targetId: string;
      mergedText: string;
      upvotes: number;
      downvotes: number;
    }) => {
      dispatch({ type: 'NOTES_MERGED', payload });
    };

    const handleAllCleared = () => {
      dispatch({ type: 'ALL_CLEARED' });
    };

    const handleConnected = () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
    };

    const handleDisconnected = () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    };

    wsManager.on('init', handleInit);
    wsManager.on('note-added', handleNoteAdded);
    wsManager.on('note-moved', handleNoteMoved);
    wsManager.on('note-updated', handleNoteUpdated);
    wsManager.on('note-deleted', handleNoteDeleted);
    wsManager.on('vote-updated', handleVoteUpdated);
    wsManager.on('notes-merged', handleNotesMerged);
    wsManager.on('all-cleared', handleAllCleared);
    wsManager.on('connected', handleConnected);
    wsManager.on('disconnected', handleDisconnected);

    return () => {
      wsManager.off('init', handleInit);
      wsManager.off('note-added', handleNoteAdded);
      wsManager.off('note-moved', handleNoteMoved);
      wsManager.off('note-updated', handleNoteUpdated);
      wsManager.off('note-deleted', handleNoteDeleted);
      wsManager.off('vote-updated', handleVoteUpdated);
      wsManager.off('notes-merged', handleNotesMerged);
      wsManager.off('all-cleared', handleAllCleared);
      wsManager.off('connected', handleConnected);
      wsManager.off('disconnected', handleDisconnected);
      wsManager.close();
    };
  }, []);

  const getNoteRank = useCallback(
    (noteId: string): number | null => {
      const notesArray = Array.from(state.notes.values());
      const sorted = [...notesArray].sort((a, b) => {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        return scoreB - scoreA;
      });
      const index = sorted.findIndex((n) => n.id === noteId);
      return index >= 0 ? index + 1 : null;
    },
    [state.notes]
  );

  const handleBoardClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== boardRef.current) return;

      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - NOTE_SIZE / 2;
      const y = e.clientY - rect.top - NOTE_SIZE / 2;

      const newNote: Note = {
        id: uuidv4(),
        x: Math.max(0, x),
        y: Math.max(0, y),
        text: '',
        color: '#ffffff',
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      };

      dispatch({ type: 'NOTE_ADDED', payload: newNote });
      wsManager.addNote(newNote);
    },
    []
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggingNoteId(id);
  }, []);

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setDraggingNoteId(null);

      let nearestNoteId: string | null = null;
      let minDistance = Infinity;

      state.notes.forEach((note, noteId) => {
        if (noteId === id) return;

        const dx = note.x + NOTE_SIZE / 2 - (x + NOTE_SIZE / 2);
        const dy = note.y + NOTE_SIZE / 2 - (y + NOTE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MERGE_DISTANCE * 2 && distance < minDistance) {
          minDistance = distance;
          nearestNoteId = noteId;
        }
      });

      if (nearestNoteId && minDistance < MERGE_DISTANCE * 2) {
        setMergeDialog({ sourceId: id, targetId: nearestNoteId });
      }

      setNearbyNoteId(null);
      setShakingNoteId(null);
    },
    [state.notes]
  );

  useEffect(() => {
    if (!draggingNoteId) return;

    const checkNearby = () => {
      const draggingNote = state.notes.get(draggingNoteId);
      if (!draggingNote) return;

      let nearestNoteId: string | null = null;
      let minDistance = Infinity;

      state.notes.forEach((note, noteId) => {
        if (noteId === draggingNoteId) return;

        const dx = note.x + NOTE_SIZE / 2 - (draggingNote.x + NOTE_SIZE / 2);
        const dy = note.y + NOTE_SIZE / 2 - (draggingNote.y + NOTE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MERGE_DISTANCE * 2 && distance < minDistance) {
          minDistance = distance;
          nearestNoteId = noteId;
        }
      });

      if (nearestNoteId && minDistance < MERGE_DISTANCE * 2) {
        if (nearbyNoteId !== nearestNoteId) {
          setNearbyNoteId(nearestNoteId);
          setShakingNoteId(nearestNoteId);
          setTimeout(() => setShakingNoteId(null), 200);
        }
      } else {
        setNearbyNoteId(null);
        setShakingNoteId(null);
      }
    };

    const interval = setInterval(checkNearby, 50);
    return () => clearInterval(interval);
  }, [draggingNoteId, state.notes, nearbyNoteId]);

  const handleMergeConfirm = useCallback(() => {
    if (!mergeDialog) return;

    const sourceNote = state.notes.get(mergeDialog.sourceId);
    const targetNote = state.notes.get(mergeDialog.targetId);

    if (!sourceNote || !targetNote) {
      setMergeDialog(null);
      return;
    }

    const mergedText = [targetNote.text, sourceNote.text].filter((t) => t.trim()).join('\n');

    wsManager.mergeNotes(mergeDialog.sourceId, mergeDialog.targetId, mergedText);
    setMergeDialog(null);
  }, [mergeDialog, state.notes]);

  const handleMergeCancel = useCallback(() => {
    setMergeDialog(null);
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('确定要清除所有便签吗？此操作不可撤销。')) {
      wsManager.clearAll();
    }
  }, []);

  const handleExport = useCallback(() => {
    const notesArray = Array.from(state.notes.values());
    const html = generateReport(notesArray);
    downloadReport(html, `brainstorm-report-${meetingId}.html`);
  }, [state.notes, meetingId]);

  const toggleVotePanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_VOTE_PANEL' });
  }, []);

  const notesArray = Array.from(state.notes.values());

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-left">
          <h1 className="app-title">🧠 BrainStorm</h1>
          <span className="meeting-id">会议ID: {meetingId}</span>
        </div>
        <div className="navbar-right">
          <div className={`connection-status ${state.isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {state.isConnected ? '已连接' : '连接中...'}
          </div>
          <button className="nav-btn vote-btn" onClick={toggleVotePanel}>
            🏆 投票排名
          </button>
          <button className="nav-btn export-btn" onClick={handleExport}>
            📥 导出报告
          </button>
          <button className="nav-btn clear-btn" onClick={handleClearAll}>
            🗑️ 清除全部
          </button>
        </div>
      </header>

      <main className="board-container">
        <div
          ref={boardRef}
          className="whiteboard"
          onClick={handleBoardClick}
        >
          {notesArray.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isNearby={nearbyNoteId === note.id}
              isShaking={shakingNoteId === note.id}
              rank={state.showVotePanel ? getNoteRank(note.id) : null}
            />
          ))}

          {notesArray.length === 0 && (
            <div className="empty-board-hint">
              <div className="hint-icon">💡</div>
              <h2>点击白板添加你的第一个创意便签</h2>
              <p>双击便签编辑内容，拖动便签调整位置或合并</p>
            </div>
          )}
        </div>
      </main>

      <VotePanel
        notes={notesArray}
        isOpen={state.showVotePanel}
        onClose={toggleVotePanel}
      />

      {mergeDialog && (
        <div className="merge-dialog-overlay" onClick={handleMergeCancel}>
          <div className="merge-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>合并便签</h3>
            <p>确定要将这两个便签合并吗？合并后内容将按行组合。</p>
            <div className="merge-preview">
              <div className="merge-note source" style={{ backgroundColor: state.notes.get(mergeDialog.sourceId)?.color }}>
                <div className="merge-note-label">源便签</div>
                <div className="merge-note-text">
                  {state.notes.get(mergeDialog.sourceId)?.text || '(空)'}
                </div>
              </div>
              <div className="merge-arrow">+</div>
              <div className="merge-note target" style={{ backgroundColor: state.notes.get(mergeDialog.targetId)?.color }}>
                <div className="merge-note-label">目标便签</div>
                <div className="merge-note-text">
                  {state.notes.get(mergeDialog.targetId)?.text || '(空)'}
                </div>
              </div>
            </div>
            <div className="merge-dialog-buttons">
              <button className="btn cancel" onClick={handleMergeCancel}>
                取消
              </button>
              <button className="btn confirm" onClick={handleMergeConfirm}>
                确认合并
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
