import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import NoteDetailModal from './NoteDetailModal';
import { useBrainstormStore } from './store';

export default function App() {
  const { selectedNoteId, setSelectedNoteId } = useBrainstormStore();

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
    const canvasEl = document.getElementById('canvas-content');
    if (!canvasEl) return;

    try {
      const canvas = await html2canvas(canvasEl, {
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
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas onSelectNote={handleSelectNote} />
      <Toolbar onExportPNG={handleExportPNG} />

      {selectedNoteId && (
        <NoteDetailModal noteId={selectedNoteId} onClose={handleCloseModal} />
      )}
    </div>
  );
}
