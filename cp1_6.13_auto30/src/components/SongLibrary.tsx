import React, { useState } from 'react';
import { Song } from '../types';
import SongCard from './SongCard';

interface SongLibraryProps {
  songs: Song[];
  onDragStart?: (e: React.DragEvent, song: Song) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  genres: string[];
}

const SongLibrary: React.FC<SongLibraryProps> = ({
  songs,
  onDragStart,
  onDragEnd,
  genres,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('全部');

  const filteredSongs = selectedGenre === '全部'
    ? songs
    : songs.filter((s) => s.genre === selectedGenre);

  const handleDragStart = (e: React.DragEvent, song: Song) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ song, source: 'library' }));
    if (onDragStart) {
      onDragStart(e, song);
    }
  };

  return (
    <div className="song-library">
      <div className="song-library__header">
        <h3 className="song-library__title">曲库</h3>
        <span className="song-library__count">{songs.length} 首歌曲</span>
      </div>

      <div className="song-library__genres">
        <button
          className={`genre-tag ${selectedGenre === '全部' ? 'genre-tag--active' : ''}`}
          onClick={() => setSelectedGenre('全部')}
        >
          全部
        </button>
        {genres.map((genre) => (
          <button
            key={genre}
            className={`genre-tag ${selectedGenre === genre ? 'genre-tag--active' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="song-library__list">
        {filteredSongs.map((song, index) => (
          <SongCard
            key={song.id}
            song={song}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            animationDelay={index * 20}
          />
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
