import React, { useState } from 'react';
import { Character, Action, StoryData } from './types';
import Editor from './Editor';
import Player from './Player';
import SaveLoad from './SaveLoad';

type TabType = 'editor' | 'player' | 'saveload';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [storyName, setStoryName] = useState<string>('我的动画故事');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [playhead, setPlayhead] = useState<number>(0);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'editor', label: '编辑器' },
    { key: 'player', label: '播放' },
    { key: 'saveload', label: '保存加载' }
  ];

  const loadStoryData = (data: StoryData) => {
    setStoryName(data.name);
    setCharacters(data.characters);
    setActions(data.actions);
    if (data.lastSaved) {
      setLastSaved(data.lastSaved);
    }
  };

  const getStoryData = (): StoryData => ({
    name: storyName,
    characters,
    actions,
    lastSaved
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎬 动画故事工坊</h1>
      </header>

      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div key={activeTab} className="tab-panel">
          {activeTab === 'editor' && (
            <Editor
              characters={characters}
              setCharacters={setCharacters}
              actions={actions}
              setActions={setActions}
              playhead={playhead}
              setPlayhead={setPlayhead}
            />
          )}
          {activeTab === 'player' && (
            <Player
              characters={characters}
              actions={actions}
              playhead={playhead}
              setPlayhead={setPlayhead}
            />
          )}
          {activeTab === 'saveload' && (
            <SaveLoad
              storyName={storyName}
              setStoryName={setStoryName}
              lastSaved={lastSaved}
              setLastSaved={setLastSaved}
              getStoryData={getStoryData}
              loadStoryData={loadStoryData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
