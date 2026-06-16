import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface Slot {
  date: string
  time: number
  available: boolean
  bookingId?: string
}

interface SlotGridProps {
  slots: Slot[]
  selectedDate: string
  onDateChange: (date: string) => void
  onSelectSlot: (time: number, duration: number) => void
  trainerId: string
}

const DURATIONS = [30, 45, 60]

function formatTime(hour: number) {
  return `${hour.toString().padStart(2, '0')}:00`
}

function getNext7Days() {
  const days: { date: string; weekday: string; day: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      date: d.toISOString().split('T')[0],
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate().toString(),
    })
  }
  return days
}

export default function SlotGrid({ slots, selectedDate, onDateChange, onSelectSlot }: SlotGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(45)
  const [showDurationPicker, setShowDurationPicker] = useState(false)

  const days = getNext7Days()

  const dateSlots = slots.filter((s) => s.date === selectedDate)

  const handleSlotClick = (time: number, available: boolean) => {
    if (!available) return
    if (selectedSlot === time) {
      setSelectedSlot(null)
      setShowDurationPicker(false)
    } else {
      setSelectedSlot(time)
      setSelectedDuration(45)
      setShowDurationPicker(true)
    }
  }

  const handleConfirm = () => {
    if (selectedSlot !== null) {
      onSelectSlot(selectedSlot, selectedDuration)
      setSelectedSlot(null)
      setShowDurationPicker(false)
    }
  }

  const isSlotAvailable = (time: number) => {
    const slot = dateSlots.find((s) => s.time === time)
    return slot ? slot.available : true
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 8)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => {
              onDateChange(d.date)
              setSelectedSlot(null)
              setShowDurationPicker(false)
            }}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
              selectedDate === d.date
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <span className="text-xs">{d.weekday}</span>
            <span className="text-base font-bold">{d.day}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        {hours.map((hour) => {
          const available = isSlotAvailable(hour)
          const isSelected = selectedSlot === hour

          return (
            <button
              key={hour}
              onClick={() => handleSlotClick(hour, available)}
              disabled={!available}
              className={cn(
                'py-2.5 rounded-lg text-sm font-medium transition-all',
                !available && 'bg-[#E0E0E0] text-gray-400 cursor-not-allowed',
                available && !isSelected && 'bg-[#1976D2] text-white hover:bg-primary-600 cursor-pointer',
                isSelected && 'bg-primary-500 text-white ring-2 ring-primary-300 cursor-pointer'
              )}
            >
              {formatTime(hour)}
            </button>
          )
        })}
      </div>

      {showDurationPicker && selectedSlot !== null && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">
            Select duration for {formatTime(selectedSlot)}
          </p>

          <div className="flex gap-2 mb-3">
            {DURATIONS.map((dur) => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  selectedDuration === dur
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {dur} min
              </button>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-colors"
            style={{ backgroundColor: '#FF9800' }}
          >
            Confirm Booking
          </button>
        </div>
      )}
    </div>
  )
}
