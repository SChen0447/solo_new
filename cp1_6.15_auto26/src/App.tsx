import { useState, useEffect } from 'react';
import { Scene3D } from './components/Scene3D';
import { UIPanel } from './components/UIPanel';
import { useBoneStore } from './components/BoneManager';
import './style.css';

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const { isCompleted } = useBoneStore();

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsNarrowScreen(window.innerWidth <= 1440);
      if (window.innerWidth <= 1440) {
        setLeftCollapsed(true);
      }
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const handleToggleLeft = () => {
    setLeftCollapsed((prev) => !prev);
  };

  const handleToggleRight = () => {
    setRightOpen((prev) => !prev);
  };

  const containerClass = [
    'app-container',
    leftCollapsed ? 'left-collapsed' : '',
    rightOpen ? 'right-open' : '',
    isNarrowScreen && !leftCollapsed ? 'left-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <UIPanel
        leftCollapsed={leftCollapsed}
        rightOpen={rightOpen}
        onToggleLeft={handleToggleLeft}
        onToggleRight={handleToggleRight}
      />
      <main className="center-view">
        <Scene3D />
      </main>
    </div>
  );
}
