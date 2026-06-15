export interface LyricLine {
  time: number
  text: string
}

export function parseLyrics(lyricsText: string): LyricLine[] {
  const lines = lyricsText.split('\n')
  const result: LyricLine[] = []

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/

  for (const line of lines) {
    const match = line.match(timeRegex)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10)
      const time = minutes * 60 + seconds + milliseconds / 1000
      const text = line.replace(timeRegex, '').trim()
      result.push({ time, text })
    } else if (line.trim()) {
      if (result.length > 0) {
        result[result.length - 1].text += ' ' + line.trim()
      }
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
