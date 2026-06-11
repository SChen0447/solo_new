import Canvas from './components/Canvas/Canvas';
import Sidebar from './components/Sidebar/Sidebar';

export default function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <Canvas />
    </div>
  );
}
