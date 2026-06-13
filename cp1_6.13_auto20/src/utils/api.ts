import { events, type HistoryEvent } from '@/data/events'

export function getEventsByEra(era: string): Promise<HistoryEvent[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = events.filter((e) => e.eras.includes(era))
      resolve(result)
    }, 100)
  })
}

export function searchEvents(keyword: string): Promise<HistoryEvent[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!keyword.trim()) {
        resolve([])
        return
      }
      const lower = keyword.toLowerCase()
      const result = events.filter(
        (e) =>
          e.title.toLowerCase().includes(lower) ||
          e.description.toLowerCase().includes(lower) ||
          e.year.toLowerCase().includes(lower)
      )
      resolve(result)
    }, 80)
  })
}
