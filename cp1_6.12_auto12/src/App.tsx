import { useCallback, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import NoteDetailModal from './NoteDetailModal';
import { useBrainstormStore } from './store';
import {
  addNoteAction,
  moveNoteAction,
  updateNoteAction,
  deleteNoteAction,
  voteNoteAction,
  clearCanvasAction,
  setViewportAction,
  setSelectedNoteIdAction,
} from './store';
import type { NoteType, Viewport, StickyNote, FontSize } from './types';

export default function App() {
  const notes = useBrainstormStore((s) => s.notes);
  const viewport = useBrainstormStore((s) => s.viewport);
  const selectedNoteId = useBrainstormStore((s) => s.selectedNoteId);
  const userId = useBrainstormStore((s) => s.userId);

  const [exporting, setExporting] = useState(false);

  const handleSelectNote = useCallback((id: string | null) => {
    setSelectedNoteIdAction(id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedNoteIdAction(null);
  }, []);

  const handleAddNote = useCallback((type: NoteType) => {
    addNoteAction(type);
  }, []);

  const handleClearCanvas = useCallback(() => {
    clearCanvasAction();
  }, []);

  const handlePositionSync = useCallback((id: string, x: number, y: number) => {
    moveNoteAction(id, x, y);
  }, []);

  const handleNoteContentUpdate = useCallback((id: string, content: string) => {
    updateNoteAction(id, { content } as Partial<StickyNote>);
  }, []);

  const handleNoteFontSizeChange = useCallback((id: string, size: FontSize) => {
    updateNoteAction(id, { fontSize: size } as Partial<StickyNote>);
  }, []);

  const handleNoteColorChange = useCallback((id: string, color: string) => {
    updateNoteAction(id, { color } as Partial<StickyNote>);
  }, []);

  const handleVoteNote = useCallback((id: string) => {
    voteNoteAction(id);
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    deleteNoteAction(id);
  }, []);

  const handleViewportChange = useCallback((vp: Partial<Viewport>) => {
    setViewportAction(vp);
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (notes.length === 0 || exporting) return;
    setExporting(true);

    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      notes.forEach((note) => {
        minX = Math.min(minX, note.x - 10);
        minY = Math.min(minY, note.y - 10);
        maxX = Math.max(maxX, note.x + note.width + 10);
        maxY = Math.max(maxY, note.y + note.height + 10);
      });

      const padding = 80;
      const exportWidth = Math.ceil(maxX - minX + padding * 2);
      const exportHeight = Math.ceil(maxY - minY + padding * 2);

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = `${exportWidth}px`;
      container.style.height = `${exportHeight}px`;
      container.style.backgroundColor = '#FFF8F0';
      container.style.overflow = 'hidden';
      container.style.backgroundImage = `
        linear-gradient(rgba(232, 228, 224, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232, 228, 224, 0.5) 1px, transparent 1px)
      `;
      container.style.backgroundSize = '40px 40px';
      document.body.appendChild(container);

      const canvasContent = document.getElementById('canvas-content');
      if (canvasContent) {
        const clone = canvasContent.cloneNode(true) as HTMLElement;
        clone.id = '';
        clone.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;
        clone.style.transformOrigin = '0 0';
        clone.style.willChange = 'auto';
        container.appendChild(clone);
      }

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(0))));

      const canvas = await html2canvas(container, {
        backgroundColor: '#FFF8F0',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const clonedCanvas = doc.querySelector('#canvas-content');
          if (clonedCanvas) (clonedCanvas as HTMLElement).style.willChange = 'auto';
        },
      });

      const link = document.createElement('a');
      link.download = `brainstorm-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      document.body.removeChild(container);
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setTimeout(() => setExporting(false), 400);
    }
  }, [notes, exporting]);

  useEffect(() => {
    setExporting(false);
  }, []);

  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  return (
    <div className="w-full h-full relative">
      <Canvas
        notes={notes}
        viewport={viewport}
        onSelectNote={handleSelectNote}
        onPositionSync={handlePositionSync}
        onNoteContentUpdate={handleNoteContentUpdate}
        onNoteFontSizeChange={handleNoteFontSizeChange}
        onNoteColorChange={handleNoteColorChange}
        onVoteNote={handleVoteNote}
        onViewportChange={handleViewportChange}
      />
      <Toolbar
        onAddNote={handleAddNote}
        onClearCanvas={handleClearCanvas}
        onExportPNG={handleExportPNG}
        exporting={exporting}
        notesCount={notes.length}
      />

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={handleCloseModal}
          onDelete={handleDeleteNote}
          onVote={handleVoteNote}
          userId={userId}
        />
      )}
    </div>
  );
}
