import { SceneView } from './components/SceneView';
import { Toolbar } from './components/Toolbar';
import { InfoPanel } from './components/InfoPanel';
import './index.css';

function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneView />
      <Toolbar />
      <InfoPanel />
    </div>
  );
}

export default App;
