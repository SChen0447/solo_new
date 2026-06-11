import { useState } from 'react'
import { cn } from '@/lib/utils'

interface FlashCardProps {
  question: string
  answer: string
  isFlipped?: boolean
  onClick?: () => void
  height?: number
}

export default function FlashCard({
  question,
  answer,
  isFlipped: controlledFlipped,
  onClick,
  height = 200,
}: FlashCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      setInternalFlipped(!internalFlipped)
    }
  }

  return (
    <div
      className="flashcard-container w-full cursor-pointer shadow-md"
      style={{ height }}
      onClick={handleClick}
    >
      <div
        className={cn('flashcard-inner w-full h-full', {
          flipped: isFlipped,
        })}
      >
        <div className="flashcard-front">
          <p className="text-xl font-medium text-primary text-center">{question}</p>
        </div>
        <div className="flashcard-back">
          <p className="text-base text-gray-700 text-center">{answer}</p>
        </div>
      </div>
    </div>
  )
}
