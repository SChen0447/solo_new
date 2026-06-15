import React, { useState, useEffect } from 'react';
import { DataStoreProvider, useDataStore } from './dataStore';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import BudgetPanel from './components/BudgetPanel';
import Dashboard from './components/Dashboard';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  alertBar: {
    backgroundColor: '#e94560',
    color: 'white',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'center',
    animation: 'alertPulse 2s ease-in-out infinite'
  },
  header: {
    padding: '24px 32px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    color: '#e0e0e0'
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#888',
    marginTop: '4px'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 32px',
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '20px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
    margin: 0
  }
};

function AlertBar() {
  const { getOverBudgetCategories } = useDataStore();
  const overBudgetCats = getOverBudgetCategories();

  useEffect(() => {
    if (overBudgetCats.length > 0) {
      const styleId = 'alert-pulse-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes alertPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [overBudgetCats.length]);

  if (overBudgetCats.length === 0) return null;

  return (
    <div style={styles.alertBar}>
      ⚠️ {overBudgetCats.join('、')} 类别预算超支！
    </div>
  );
}

function AppContent() {
  const { transactions } = useDataStore();

  return (
    <div style={styles.app}>
      <AlertBar />

      <header style={styles.header} data-app-header>
        <h1 style={styles.headerTitle}>个人财务仪表盘</h1>
        <p style={styles.headerSubtitle}>记录收支，掌控预算，洞察财务状况</p>
      </header>

      <main style={styles.main} data-main-grid>
        <div style={styles.leftColumn}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>数据概览</h2>
            <Dashboard />
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>添加交易</h2>
            <TransactionForm />
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>交易记录</h2>
            <TransactionList transactions={transactions} />
          </div>
        </div>

        <div style={styles.rightColumn}>
          <BudgetPanel />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <DataStoreProvider>
      <AppContent />
    </DataStoreProvider>
  );
}

export default App;
