import { DashboardPanel } from './modules/dashboard';
import { DeviceControl } from './modules/control';
import { EventLog } from './modules/log';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__logo">
          <span className="app__logo-icon">⚡</span>
          <h1 className="app__title">SwitchBoard</h1>
        </div>
        <span className="app__subtitle">IoT 设备监控面板</span>
      </header>
      <main className="app__main">
        <section className="app__dashboard">
          <DashboardPanel />
        </section>
        <aside className="app__sidebar">
          <DeviceControl />
        </aside>
      </main>
      <footer className="app__footer">
        <EventLog />
      </footer>
    </div>
  );
}
