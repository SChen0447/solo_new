import React, { useState, useEffect, useCallback } from 'react';
import type { DiaryEntry as DiaryEntryType, TabType } from './types';
import { getDiaries } from './utils/storage';
import DiaryEntry from './modules/diary/DiaryEntry';
import DiaryList from './modules/diary/DiaryList';
import ChartPanel from './modules/charts/ChartPanel';

const TABS: { key: TabType; label: string }[] = [
  { key: 'entry', label: '写日记' },
  { key: 'list', label: '看日记' },
  { key: 'chart', label: '看趋势' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('entry');
  const [diaries, setDiaries] = useState<DiaryEntryType[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayTab, setDisplayTab] = useState<TabType>('entry');

  useEffect(() => {
    const loaded = getDiaries();
    setDiaries(loaded);
  }, []);

  const loadDiaries = useCallback(() => {
    const loaded = getDiaries();
    setDiaries(loaded);
  }, []);

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setDisplayTab(tab);
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 150);
  };

  const handleSave = useCallback(() => {
    loadDiaries();
  }, [loadDiaries]);

  const handleDelete = useCallback(() => {
    loadDiaries();
  }, [loadDiaries]);

  const renderContent = () => {
    switch (displayTab) {
      case 'entry':
        return <DiaryEntry onSave={handleSave} />;
      case 'list':
        return <DiaryList diaries={diaries} onDelete={handleDelete} />;
      case 'chart':
        return <ChartPanel diaries={diaries} />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="app-header">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="content-wrapper">
        <div
          className={isTransitioning ? 'fade-exit fade-exit-active' : ''}
        >
          {!isTransitioning && (
            <div className="fade-enter fade-enter-active">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
