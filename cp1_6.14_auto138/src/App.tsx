import { useGameStore } from './store/useGameStore'
import { Battlefield } from './components/Battlefield'
import { GameHUD, ComboDisplay, PixelAvatar } from './components/GameHUD'
import { TypeInput } from './components/TypeInput'
import { LevelSelect } from './components/LevelSelect'
import { ResultPanel } from './components/ResultPanel'

function App() {
  const status = useGameStore((s) => s.status)

  return (
    <div className="app-container">
      <GameHUD />

      <div className="game-main-area">
        {status === 'menu' && <LevelSelect />}

        {status === 'playing' && (
          <>
            <Battlefield />
            <ComboDisplay />
            <PixelAvatar />
          </>
        )}

        {status === 'gameover' && (
          <>
            <Battlefield />
            <ResultPanel />
          </>
        )}
      </div>

      {status === 'playing' && (
        <div className="game-footer">
          <TypeInput />
        </div>
      )}
    </div>
  )
}

export default App
