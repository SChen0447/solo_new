import { useState, useEffect } from 'react';
import TeacherPanel from './TeacherPanel';
import StudentQuiz from './StudentQuiz';

type View = 'home' | 'teacher' | 'student';

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#1976D2',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 1000
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 500,
    flex: 1
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 13,
    marginLeft: 12
  },
  mainContainer: {
    marginTop: 56,
    padding: 24,
    minHeight: 'calc(100vh - 56px)',
    backgroundColor: '#F5F5F5'
  },
  homeCard: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E0E0E0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center'
  },
  homeSubtitle: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 32,
    textAlign: 'center'
  },
  roleSelector: {
    display: 'flex',
    gap: 24,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  roleCard: {
    width: 280,
    padding: 32,
    border: '2px solid #E0E0E0',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    backgroundColor: '#FFFFFF'
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  roleName: {
    fontSize: 20,
    fontWeight: 600,
    color: '#212121',
    marginBottom: 8
  },
  roleDesc: {
    fontSize: 14,
    color: '#757575'
  }
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [roleLabel, setRoleLabel] = useState<string>('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === '/teacher') {
      setView('teacher');
      setRoleLabel('教师端');
    } else if (hash.startsWith('/student')) {
      setView('student');
      setRoleLabel('学生端');
    }
  }, []);

  const handleNavClick = (target: View) => {
    setView(target);
    if (target === 'teacher') {
      window.location.hash = '/teacher';
      setRoleLabel('教师端');
    } else if (target === 'student') {
      window.location.hash = '/student';
      setRoleLabel('学生端');
    } else {
      window.location.hash = '';
      setRoleLabel('');
    }
  };

  const getPageTitle = () => {
    if (view === 'teacher') return '教师控制台';
    if (view === 'student') return '学生测验';
    return '在线随堂测验系统';
  };

  return (
    <div>
      <div style={styles.navbar}>
        <div style={styles.navTitle}>{getPageTitle()}</div>
        {view !== 'home' && (
          <>
            <span style={styles.roleBadge}>{roleLabel}</span>
            <button
              onClick={() => handleNavClick('home')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#FFF',
                padding: '6px 14px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                marginLeft: 8
              }}
            >
              返回首页
            </button>
          </>
        )}
      </div>

      <div style={styles.mainContainer}>
        {view === 'home' && (
          <div style={styles.homeCard}>
            <h1 style={styles.homeTitle}>📝 在线随堂测验系统</h1>
            <p style={styles.homeSubtitle}>
              支持即时反馈的课堂测验工具 · 让批改零延迟
            </p>
            <div style={styles.roleSelector}>
              <div
                style={styles.roleCard}
                onClick={() => handleNavClick('teacher')}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#1976D2';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(25,118,210,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E0E0E0';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={styles.roleIcon}>👨‍🏫</div>
                <div style={styles.roleName}>我是教师</div>
                <div style={styles.roleDesc}>创建测验、邀请学生、查看统计</div>
              </div>
              <div
                style={styles.roleCard}
                onClick={() => handleNavClick('student')}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#FF9800';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(255,152,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E0E0E0';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={styles.roleIcon}>🎓</div>
                <div style={styles.roleName}>我是学生</div>
                <div style={styles.roleDesc}>输入邀请码、答题、即时反馈</div>
              </div>
            </div>
          </div>
        )}
        {view === 'teacher' && <TeacherPanel />}
        {view === 'student' && <StudentQuiz />}
      </div>
    </div>
  );
}
