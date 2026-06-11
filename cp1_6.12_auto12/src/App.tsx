import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import NoteDetailModal from './NoteDetailModal';
import { useBrainstormStore } from './store';

export default function App() {
  const { selectedNoteId, setSelectedNoteId, notes, viewport } = useBrainstormStore();
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const handleSelectNote = useCallback(
    (id: string) => {
      setSelectedNoteId(id);
    },
    [setSelectedNoteId]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedNoteId(null);
  }, [setSelectedNoteId]);

  const handleExportPNG = useCallback(async () => {
    if (notes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    notes.forEach((note) => {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      maxX = Math.max(maxX, note.x + note.width);
      maxY = Math.max(maxY, note.y + note.height);
    });

    const padding = 60;
    const exportWidth = maxX - minX + padding * 2;
    const exportHeight = maxY - minY + padding * 2;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
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
      clone.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;
      clone.style.transformOrigin = '0 0';
      clone.id = '';
      container.appendChild(clone);
    }

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#FFF8F0',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `brainstorm-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      document.body.removeChild(container);
    }
  }, [notes, viewport]);

  return (
    <div className="w-full h-full relative" ref={exportContainerRef}>
      <Canvas onSelectNote={handleSelectNote} />
      <Toolbar onExportPNG={handleExportPNG} />

      {selectedNoteId && (
        <NoteDetailModal noteId={selectedNoteId} onClose={handleCloseModal} />
      )}
    </div>
  );
}
