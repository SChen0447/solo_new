import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import EditorPanel from './components/EditorPanel';
import GalleryPanel from './components/GalleryPanel';
import {
  loadArtworks,
  saveArtwork,
  deleteArtwork as deleteArtworkFromStorage,
  createArtworkFromEmitters,
  type Artwork
} from './modules/presetManager';
import type { EmitterConfig } from './modules/particleEngine';
import './styles/App.css';

const App: React.FC = () => {
  const [emitters, setEmitters] = useState<EmitterConfig[]>([]);
  const [backgroundColor, setBackgroundColor] = useState('#0D0D1A');
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    setArtworks(loadArtworks());
  }, []);

  const handleSave = useCallback(
    (name: string, thumbnail: string) => {
      const newArtwork = createArtworkFromEmitters(name, emitters, backgroundColor, thumbnail);
      saveArtwork(newArtwork);
      setArtworks(loadArtworks());
    },
    [emitters, backgroundColor]
  );

  const handleLoadArtwork = useCallback((artwork: Artwork) => {
    setEmitters(
      artwork.emitters.map(e => ({
        ...e,
        id: e.id || uuidv4()
      }))
    );
    setBackgroundColor(artwork.backgroundColor);
  }, []);

  const handleDeleteArtwork = useCallback((id: string) => {
    if (window.confirm('确定要删除这个作品吗？')) {
      deleteArtworkFromStorage(id);
      setArtworks(loadArtworks());
    }
  }, []);

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">✨ 粒子艺术工坊</h1>
        <p className="app-subtitle">创建属于你的交互式粒子艺术动画</p>
      </div>
      <div className="app-main">
        <GalleryPanel
          artworks={artworks}
          onLoad={handleLoadArtwork}
          onDelete={handleDeleteArtwork}
        />
        <EditorPanel
          onSave={handleSave}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          emitters={emitters}
          onEmittersChange={setEmitters}
        />
      </div>
    </div>
  );
};

export default App;
