import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import FormBuilder from './components/FormBuilder';
import FormRenderer from './components/FormRenderer';
import ResponseDashboard from './components/ResponseDashboard';

type Route =
  | { name: 'home' }
  | { name: 'builder'; id?: string }
  | { name: 'form'; id: string }
  | { name: 'thanks' }
  | { name: 'dashboard'; id: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { name: 'home' };
  const parts = hash.split('/');
  const [route, id] = parts;
  switch (route) {
    case 'builder':
      return { name: 'builder', id };
    case 'form':
      return id ? { name: 'form', id } : { name: 'home' };
    case 'thanks':
      return { name: 'thanks' };
    case 'dashboard':
      return id ? { name: 'dashboard', id } : { name: 'home' };
    default:
      return { name: 'home' };
  }
}

function navigate(path: string) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const Header = (
    <header className="app-header">
      <div className="app-logo" onClick={() => navigate('')}>
        <div className="app-logo-icon">Q</div>
        <span>问卷构建器</span>
      </div>
      {route.name !== 'form' && route.name !== 'thanks' && (
        <button className="btn btn-primary" onClick={() => navigate('builder')}>
          <span>＋</span> 新建问卷
        </button>
      )}
    </header>
  );

  switch (route.name) {
    case 'home':
      return (
        <>
          {Header}
          <HomePage
            onEdit={(id) => navigate(`builder/${id}`)}
            onViewData={(id) => navigate(`dashboard/${id}`)}
            onPreview={(id) => navigate(`form/${id}`)}
          />
        </>
      );
    case 'builder':
      return (
        <FormBuilder
          templateId={route.id}
          onBack={() => navigate('')}
          onPublish={(id) => navigate(`form/${id}`)}
          onViewData={(id) => navigate(`dashboard/${id}`)}
        />
      );
    case 'form':
      return (
        <FormRenderer
          templateId={route.id}
          onSubmitSuccess={() => navigate('thanks')}
        />
      );
    case 'thanks':
      return (
        <div className="thank-you-container">
          <div className="thank-you-icon">✓</div>
          <h2 style={{ marginBottom: 12 }}>提交成功！</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            感谢您的宝贵时间，您的反馈对我们非常重要。
          </p>
          <button className="btn btn-primary" onClick={() => navigate('')}>
            返回首页
          </button>
        </div>
      );
    case 'dashboard':
      return (
        <>
          {Header}
          <ResponseDashboard
            templateId={route.id}
            onBack={() => navigate('')}
            onEdit={(id) => navigate(`builder/${id}`)}
            onPreview={(id) => navigate(`form/${id}`)}
          />
        </>
      );
    default:
      return null;
  }
}
