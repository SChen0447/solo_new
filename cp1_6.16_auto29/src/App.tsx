import { FileText, Upload, GraduationCap, Trophy, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useExamStore } from './stores/examStore';
import ExamManager from './modules/examManage/ExamManager';
import ExamEngine from './modules/examEngine/ExamEngine';
import ScoreBoard from './modules/scoreBoard/ScoreBoard';
import './styles/index.css';

function App() {
  const { currentPage, setCurrentPage } = useExamStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'examManage', label: '试卷管理', icon: FileText },
    { id: 'questionImport', label: '题库导入', icon: Upload },
    { id: 'examEngine', label: '考试中心', icon: GraduationCap },
    { id: 'scoreBoard', label: '成绩统计', icon: Trophy },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'examManage':
        return <ExamManager />;
      case 'questionImport':
        return <ExamManager />;
      case 'examEngine':
        return <ExamEngine />;
      case 'scoreBoard':
        return <ScoreBoard />;
      default:
        return <ExamManager />;
    }
  };

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <GraduationCap className="logo-icon" />
            <span className="logo-text">ExamForge</span>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="icon-sm" />
          </button>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="footer-text">在线考试系统 v1.0</p>
        </div>
      </aside>

      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu className="icon" />
        </button>
        <span className="mobile-title">ExamForge</span>
        <div className="mobile-spacer" />
      </div>

      <main className="main-content">
        <div className="content-wrapper">{renderContent()}</div>
      </main>

      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
