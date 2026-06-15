import React, { useState, useCallback } from 'react';
import useCarbonStore from './store/carbonStore';
import CarbonSummaryCard from './components/CarbonSummaryCard';
import ActivityForm from './components/ActivityForm';
import EmissionsChart from './components/EmissionsChart';
import SuggestionsPanel from './components/SuggestionsPanel';
import type { Suggestion, ActivityCategory } from './store/carbonStore';

const App: React.FC = () => {
  const viewMode = useCarbonStore((s) => s.viewMode);
  const setViewMode = useCarbonStore((s) => s.setViewMode);
  const [prefill, setPrefill] = useState<{
    category?: ActivityCategory;
    subType?: string;
    quantity?: number;
    key: number;
  }>({ key: 0 });

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleApplySuggestion = useCallback((suggestion: Suggestion) => {
    setPrefill({
      category: suggestion.category,
      subType: suggestion.subType,
      quantity: suggestion.quantity,
      key: Date.now(),
    });
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <span className="logo">🌿</span>
          <h1 className="app-title">碳足迹计算器</h1>
        </div>
        <div className="navbar-right">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              周
            </button>
            <button
              className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              月
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="summary-row">
          <CarbonSummaryCard />
        </div>

        <div className="content-grid">
          <div className="left-column">
            <ActivityForm
              key={prefill.key}
              prefilledCategory={prefill.category}
              prefilledSubType={prefill.subType}
              prefilledQuantity={prefill.quantity}
              onPrefillConsumed={() => setPrefill({ key: prefill.key })}
            />
            <EmissionsChart />
          </div>

          <div className="right-column">
            <SuggestionsPanel onApplySuggestion={handleApplySuggestion} />
          </div>
        </div>
      </main>

      <button
        className={`drawer-toggle ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        {drawerOpen ? '✕' : '🌿 减排建议'}
      </button>
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <SuggestionsPanel onApplySuggestion={handleApplySuggestion} />
      </div>
    </div>
  );
};

export default App;
