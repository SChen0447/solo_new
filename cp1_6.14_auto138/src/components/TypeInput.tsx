import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import './TypeInput.css'

export function TypeInput() {
  const input = useGameStore((s) => s.input)
  const setInput = useGameStore((s) => s.setInput)
  const submitInput = useGameStore((s) => s.submitInput)
  const status = useGameStore((s) => s.status)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'playing' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitInput()
    }
  }

  return (
    <div className="type-input-container">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="type-input"
        placeholder="TYPE HERE..."
        disabled={status !== 'playing'}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <div className="input-hint">PRESS ENTER TO FIRE</div>
    </div>
  )
}
