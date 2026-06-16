import type { ReactNode } from 'react'
import { Star, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Trainer {
  id: string
  name: string
  avatar: string
  specialties: string[]
  rating: number
  bio: string
}

interface TrainerCardProps {
  trainer: Trainer
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

export default function TrainerCard({ trainer, expanded, onToggle, children }: TrainerCardProps) {
  return (
    <div
      className={cn(
        'bg-white shadow-card rounded-xl p-5 transition-all duration-300',
        'hover:shadow-card-hover hover:-translate-y-0.5'
      )}
      style={{ borderRadius: 12 }}
    >
      <div className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-4">
          <img
            src={trainer.avatar}
            alt={trainer.name}
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 truncate">{trainer.name}</h3>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 transition-transform duration-300 shrink-0',
                  expanded && 'rotate-180'
                )}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {trainer.specialties.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 mt-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-3.5 h-3.5',
                    i < Math.round(trainer.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  )}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">{trainer.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-3 leading-relaxed">{trainer.bio}</p>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          expanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  )
}
