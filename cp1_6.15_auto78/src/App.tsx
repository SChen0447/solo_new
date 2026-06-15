import { Suspense } from 'react';
import FrequencyPicker from './components/FrequencyPicker';
import ParticleScene from './components/ParticleScene';

function App() {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0b0b1a'
    }}>
      <Suspense fallback={null}>
        <ParticleScene />
      </Suspense>
      <div style={{
        position: 'absolute',
        left: '40px',
        bottom: '40px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '16px',
        padding: '24px',
        backdropFilter: 'blur(8px)',
        zIndex: 10
      }}>
        <FrequencyPicker />
      </div>
    </div>
  );
}

export default App;
