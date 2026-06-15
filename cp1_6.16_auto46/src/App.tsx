import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import IdeaSubmission from './components/IdeaSubmission';
import IdeaCard from './components/IdeaCard';
import ScoringPanel from './components/ScoringPanel';
import Timeline from './components/Timeline';
import {
  DEFAULT_WEIGHTS,
  rankIdeas,
  type Idea,
  type Weights,
  type Scores,
} from './utils/scoringEngine';
import {
  getIdeas,
  saveIdeas,
  getWeights,
  saveWeights,
  getTimeline,
  saveTimeline,
  addTimelineEvent,
  type TimelineEvent,
} from './utils/storage';

const VIRTUAL_SCROLL_THRESHOLD = 50;
const VISIBLE_ITEMS = 12;
const CARD_HEIGHT = 280;

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedIdeas = getIdeas();
    const savedWeights = getWeights(DEFAULT_WEIGHTS);
    const savedTimeline = getTimeline();

    if (savedIdeas.length === 0) {
      const demoIdeas: Idea[] = [
        {
          id: uuidv4(),
          title: 'AI智能助手集成',
          description: '在产品中集成AI智能助手，帮助用户更高效地完成任务，提供智能推荐和自动化工作流功能。',
          scores: { innovation: 5, feasibility: 3, impact: 5, cost: 3, risk: 4 },
          createdAt: Date.now() - 3600000,
        },
        {
          id: uuidv4(),
          title: '实时协作功能',
          description: '支持多人实时协作编辑，看到其他用户的光标位置和编辑内容，提升团队协作效率。',
          scores: { innovation: 4, feasibility: 4, impact: 4, cost: 4, risk: 3 },
          createdAt: Date.now() - 7200000,
        },
        {
          id: uuidv4(),
          title: '移动端适配优化',
          description: '优化移动端用户体验，支持手势操作和离线模式，让用户随时随地都能使用产品。',
          scores: { innovation: 3, feasibility: 5, impact: 4, cost: 3, risk: 2 },
          createdAt: Date.now() - 10800000,
        },
      ];
      setIdeas(demoIdeas);
      saveIdeas(demoIdeas);
    } else {
      setIdeas(savedIdeas);
    }

    setWeights(savedWeights);
    setTimelineEvents(savedTimeline);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
      if (width < 1200) {
        setSettingsOpen(false);
      } else {
        setSettingsOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const rankedIdeas = useMemo(() => {
    return rankIdeas(ideas, weights);
  }, [ideas, weights]);

  const handleSubmitIdea = useCallback((title: string, description: string) => {
    const newIdea: Idea = {
      id: uuidv4(),
      title,
      description,
      scores: {
        innovation: 0,
        feasibility: 0,
        impact: 0,
        cost: 0,
        risk: 0,
      },
      createdAt: Date.now(),
    };

    const newIdeas = [newIdea, ...ideas];
    setIdeas(newIdeas);
    saveIdeas(newIdeas);

    const event: TimelineEvent = {
      id: uuidv4(),
      type: 'submit',
      ideaId: newIdea.id,
      ideaTitle: newIdea.title,
      user: '用户A',
      timestamp: Date.now(),
    };
    const newEvents = addTimelineEvent(event);
    setTimelineEvents(newEvents);

    toast.success('点子提交成功！');
  }, [ideas]);

  const handleScoreChange = useCallback((ideaId: string, dimension: keyof Scores, score: number) => {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    const updatedIdeas = ideas.map((i) =>
      i.id === ideaId
        ? { ...i, scores: { ...i.scores, [dimension]: score } }
        : i
    );
    setIdeas(updatedIdeas);
    saveIdeas(updatedIdeas);

    const dimensionLabels: Record<keyof Scores, string> = {
      innovation: '创新性',
      feasibility: '可行性',
      impact: '影响力',
      cost: '成本',
      risk: '风险',
    };

    const event: TimelineEvent = {
      id: uuidv4(),
      type: 'score',
      ideaId,
      ideaTitle: idea.title,
      dimension: dimensionLabels[dimension],
      score,
      user: '用户A',
      timestamp: Date.now(),
    };
    const newEvents = addTimelineEvent(event);
    setTimelineEvents(newEvents);
  }, [ideas]);

  const handleWeightChange = useCallback((dimension: keyof Weights, value: number) => {
    const newWeights = { ...weights, [dimension]: value };
    setWeights(newWeights);
    saveWeights(newWeights);
  }, [weights]);

  const handleResetWeights = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
    saveWeights(DEFAULT_WEIGHTS);
    toast.success('权重已重置为默认值');
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const useVirtualScroll = rankedIdeas.length > VIRTUAL_SCROLL_THRESHOLD;

  const visibleIdeas = useMemo(() => {
    if (!useVirtualScroll) return rankedIdeas;

    const startIndex = Math.floor(scrollTop / CARD_HEIGHT);
    const endIndex = Math.min(startIndex + VISIBLE_ITEMS + 2, rankedIdeas.length);
    return rankedIdeas.slice(Math.max(0, startIndex - 1), endIndex);
  }, [rankedIdeas, scrollTop, useVirtualScroll]);

  const totalHeight = useVirtualScroll ? rankedIdeas.length * CARD_HEIGHT : 'auto';

  const offsetY = useVirtualScroll
    ? Math.max(0, Math.floor(scrollTop / CARD_HEIGHT) - 1) * CARD_HEIGHT
    : 0;

  return (
    <div className="app-container">
      <Toaster position="top-center" />
      
      <header className="app-header">
        <h1 className="app-title">团队头脑风暴</h1>
        <p className="app-subtitle">点子投票与排名工具</p>
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <IdeaSubmission onSubmit={handleSubmitIdea} />
        </aside>

        <main className="center-panel">
          <div className="panel-header">
            <h2 className="panel-title">点子列表</h2>
            <span className="idea-count">共 {rankedIdeas.length} 个点子</span>
          </div>
          
          <div
            ref={listRef}
            className={`idea-list ${useVirtualScroll ? 'virtual-scroll' : ''}`}
            onScroll={handleScroll}
            style={{ height: useVirtualScroll ? 'calc(100vh - 350px)' : 'auto' }}
          >
            {useVirtualScroll && (
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      id={idea.id}
                      title={idea.title}
                      description={idea.description}
                      scores={idea.scores}
                      averageScore={idea.averageScore}
                      rank={idea.rank}
                      onScoreChange={handleScoreChange}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {!useVirtualScroll && rankedIdeas.length === 0 && (
              <div className="empty-state">
                <p>还没有点子，快来提交第一个吧！</p>
              </div>
            )}

            {!useVirtualScroll && rankedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                id={idea.id}
                title={idea.title}
                description={idea.description}
                scores={idea.scores}
                averageScore={idea.averageScore}
                rank={idea.rank}
                onScoreChange={handleScoreChange}
              />
            ))}
          </div>
        </main>

        <aside className={`right-panel ${settingsOpen ? 'open' : ''}`}>
          {!isMobile && (
            <ScoringPanel
              weights={weights}
              onWeightChange={handleWeightChange}
              onReset={handleResetWeights}
              isOpen={settingsOpen || !isTablet}
              onToggle={() => setSettingsOpen(!settingsOpen)}
            />
          )}
          
          {isMobile && settingsOpen && (
            <div className="mobile-modal">
              <ScoringPanel
                weights={weights}
                onWeightChange={handleWeightChange}
                onReset={handleResetWeights}
                isOpen={true}
                onToggle={() => setSettingsOpen(false)}
              />
            </div>
          )}
        </aside>
      </div>

      <footer className="timeline-section">
        <Timeline events={timelineEvents} />
      </footer>

      {isTablet && (
        <button
          type="button"
          className="floating-settings-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="打开设置"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      {isTablet && settingsOpen && (
        <div className="tablet-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="tablet-drawer" onClick={(e) => e.stopPropagation()}>
            <ScoringPanel
              weights={weights}
              onWeightChange={handleWeightChange}
              onReset={handleResetWeights}
              isOpen={true}
              onToggle={() => setSettingsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
