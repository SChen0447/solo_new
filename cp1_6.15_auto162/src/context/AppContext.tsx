import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface Work {
  id: string
  title: string
  artist: string
  cover_url: string
  media_url: string
  lyrics: string
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  title: string
  date: string
  time: string
  location: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  work_id: string
  parent_id: string | null
  nickname: string
  content: string
  created_at: string
  replies?: Comment[]
}

interface AppState {
  works: Work[]
  schedules: Schedule[]
  currentWork: Work | null
  isLoading: boolean
  searchQuery: string
}

interface AppContextType extends AppState {
  setWorks: (works: Work[]) => void
  setSchedules: (schedules: Schedule[]) => void
  setCurrentWork: (work: Work | null) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  filteredWorks: Work[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [works, setWorks] = useState<Work[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [currentWork, setCurrentWork] = useState<Work | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredWorks = React.useMemo(() => {
    if (!searchQuery.trim()) return works
    const query = searchQuery.toLowerCase()
    return works.filter(
      work =>
        work.title.toLowerCase().includes(query) ||
        work.artist.toLowerCase().includes(query)
    )
  }, [works, searchQuery])

  return (
    <AppContext.Provider
      value={{
        works,
        schedules,
        currentWork,
        isLoading,
        searchQuery,
        setWorks,
        setSchedules,
        setCurrentWork,
        setIsLoading,
        setSearchQuery,
        filteredWorks,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
