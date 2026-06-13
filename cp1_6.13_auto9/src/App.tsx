import { useRef } from 'react';
import Canvas from '@/Canvas';
import Toolbar from '@/Toolbar';
import NoteList from '@/NoteList';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  };

  const getCanvasElement = (): HTMLCanvasElement | null => canvasRef.current;

  return (
    <div className="flex w-screen h-screen bg-gray-50 overflow-hidden">
      <NoteList />

      <div className="relative flex-1 flex overflow-hidden">
        <Canvas onCanvasReady={handleCanvasReady} />
        <Toolbar onSave={() => {}} onExport={() => {}} getCanvas={getCanvasElement} />
      </div>
    </div>
  );
}
