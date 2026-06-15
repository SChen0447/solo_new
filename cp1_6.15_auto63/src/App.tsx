import World from './components/World';
import HUD from './components/HUD';

function App() {
  return (
    <div style={styles.app}>
      <World />
      <HUD />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    minWidth: '1024px',
    minHeight: '768px'
  }
};

export default App;
