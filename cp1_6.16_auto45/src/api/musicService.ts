import type { MusicTrack, StatsData } from '@/types'

const COVER_BASE = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image'

const mockTracks: MusicTrack[] = [
  { id: '1', title: 'Neon Dreams', artist: 'Synthwave Collective', album: 'Digital Sunset', duration: 234, coverUrl: `${COVER_BASE}?prompt=neon%20city%20night%20synthwave%20album%20cover&image_size=square`, genre: '电子', isFavorite: false },
  { id: '2', title: 'Rainy Monday', artist: 'Indie Folk', album: 'Weather Patterns', duration: 198, coverUrl: `${COVER_BASE}?prompt=rainy%20window%20folk%20album%20cover&image_size=square`, genre: '流行', isFavorite: false },
  { id: '3', title: 'Thunder Road', artist: 'Heavy Storm', album: 'Lightning Strike', duration: 312, coverUrl: `${COVER_BASE}?prompt=thunder%20rock%20album%20cover&image_size=square`, genre: '摇滚', isFavorite: false },
  { id: '4', title: 'Moonlight Sonata', artist: 'Classical Dreams', album: 'Nocturne', duration: 420, coverUrl: `${COVER_BASE}?prompt=moonlight%20piano%20classical%20album%20cover&image_size=square`, genre: '古典', isFavorite: false },
  { id: '5', title: 'Blue Note', artist: 'Jazz Ensemble', album: 'Midnight Sessions', duration: 287, coverUrl: `${COVER_BASE}?prompt=blue%20jazz%20saxophone%20album%20cover&image_size=square`, genre: '爵士', isFavorite: false },
  { id: '6', title: 'Electric Pulse', artist: 'Circuit Break', album: 'Voltage', duration: 256, coverUrl: `${COVER_BASE}?prompt=electric%20circuit%20electronic%20album%20cover&image_size=square`, genre: '电子', isFavorite: false },
  { id: '7', title: 'Summer Breeze', artist: 'Pop Stars', album: 'Sunshine', duration: 215, coverUrl: `${COVER_BASE}?prompt=summer%20beach%20pop%20album%20cover&image_size=square`, genre: '流行', isFavorite: false },
  { id: '8', title: 'Highway Star', artist: 'Deep Purple Rain', album: 'Road Trip', duration: 345, coverUrl: `${COVER_BASE}?prompt=highway%20rock%20guitar%20album%20cover&image_size=square`, genre: '摇滚', isFavorite: false },
  { id: '9', title: 'Spring Waltz', artist: 'Piano Virtuoso', album: 'Four Seasons', duration: 380, coverUrl: `${COVER_BASE}?prompt=spring%20flowers%20piano%20album%20cover&image_size=square`, genre: '古典', isFavorite: false },
  { id: '10', title: 'Smoky Room', artist: 'Blue Note Trio', album: 'Late Night', duration: 267, coverUrl: `${COVER_BASE}?prompt=smoky%20jazz%20club%20album%20cover&image_size=square`, genre: '爵士', isFavorite: false },
  { id: '11', title: 'Binary Code', artist: 'Data Flow', album: 'Algorithm', duration: 290, coverUrl: `${COVER_BASE}?prompt=binary%20code%20digital%20album%20cover&image_size=square`, genre: '电子', isFavorite: false },
  { id: '12', title: 'Heartbeat', artist: 'Love Song', album: 'Romance', duration: 203, coverUrl: `${COVER_BASE}?prompt=heart%20love%20pop%20album%20cover&image_size=square`, genre: '流行', isFavorite: false },
  { id: '13', title: 'Riff Master', artist: 'Guitar Hero', album: 'Shredding', duration: 278, coverUrl: `${COVER_BASE}?prompt=electric%20guitar%20rock%20album%20cover&image_size=square`, genre: '摇滚', isFavorite: false },
  { id: '14', title: 'Nocturne Op.9', artist: 'Chopin Redux', album: 'Romantic Era', duration: 450, coverUrl: `${COVER_BASE}?prompt=nocturne%20classical%20piano%20album%20cover&image_size=square`, genre: '古典', isFavorite: false },
  { id: '15', title: 'Swing Time', artist: 'Big Band', album: 'Golden Age', duration: 310, coverUrl: `${COVER_BASE}?prompt=swing%20jazz%20big%20band%20album%20cover&image_size=square`, genre: '爵士', isFavorite: false },
  { id: '16', title: 'Pixel Rain', artist: 'Chip Tune', album: '8-Bit World', duration: 180, coverUrl: `${COVER_BASE}?prompt=pixel%20rain%20retro%20game%20album%20cover&image_size=square`, genre: '电子', isFavorite: false },
  { id: '17', title: 'Dancing Queen', artist: 'Disco Fever', album: 'Groove', duration: 245, coverUrl: `${COVER_BASE}?prompt=disco%20dance%20pop%20album%20cover&image_size=square`, genre: '流行', isFavorite: false },
  { id: '18', title: 'Iron Will', artist: 'Metal Storm', album: 'Forge', duration: 398, coverUrl: `${COVER_BASE}?prompt=iron%20metal%20forge%20album%20cover&image_size=square`, genre: '摇滚', isFavorite: false },
  { id: '19', title: 'Cello Suite', artist: 'Bach Revival', album: 'Baroque', duration: 520, coverUrl: `${COVER_BASE}?prompt=cello%20baroque%20classical%20album%20cover&image_size=square`, genre: '古典', isFavorite: false },
  { id: '20', title: 'Cool Blues', artist: 'Miles Ahead', album: 'Kind of Blue', duration: 335, coverUrl: `${COVER_BASE}?prompt=cool%20blue%20jazz%20trumpet%20album%20cover&image_size=square`, genre: '爵士', isFavorite: false },
  { id: '21', title: 'Starlight', artist: 'Cosmic Wave', album: 'Nebula', duration: 275, coverUrl: `${COVER_BASE}?prompt=starlight%20cosmic%20space%20album%20cover&image_size=square`, genre: '电子', isFavorite: false },
  { id: '22', title: 'Golden Hour', artist: 'Sunset Pop', album: 'Twilight', duration: 220, coverUrl: `${COVER_BASE}?prompt=golden%20sunset%20pop%20album%20cover&image_size=square`, genre: '流行', isFavorite: false },
  { id: '23', title: 'Rebel Yell', artist: 'Punk Avenue', album: 'Anarchy', duration: 165, coverUrl: `${COVER_BASE}?prompt=rebel%20punk%20rock%20album%20cover&image_size=square`, genre: '摇滚', isFavorite: false },
  { id: '24', title: 'Violin Concerto', artist: 'String Theory', album: 'Harmony', duration: 480, coverUrl: `${COVER_BASE}?prompt=violin%20orchestra%20classical%20album%20cover&image_size=square`, genre: '古典', isFavorite: false },
  { id: '25', title: 'Late Night Jazz', artist: 'Smooth Operators', album: 'Velvet', duration: 298, coverUrl: `${COVER_BASE}?prompt=late%20night%20jazz%20smooth%20album%20cover&image_size=square`, genre: '爵士', isFavorite: false },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getTracks(): Promise<MusicTrack[]> {
  await delay(200)
  return [...mockTracks]
}

export async function searchTracks(query: string): Promise<MusicTrack[]> {
  await delay(150)
  const q = query.toLowerCase().trim()
  if (!q) return [...mockTracks]
  return mockTracks.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q)
  )
}

export async function getRecommendations(): Promise<MusicTrack[]> {
  await delay(300)
  const shuffled = [...mockTracks].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 8)
}

export function getStatsData(history: { track: MusicTrack; timestamp: number }[]): StatsData {
  const totalPlays = history.length
  const totalFavorites = mockTracks.filter(t => t.isFavorite).length
  const totalPlayTime = history.reduce((acc, h) => acc + h.track.duration, 0)

  const now = Date.now()
  const dayMs = 86400000
  const weeklyPlays = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * dayMs
    const dayEnd = dayStart + dayMs
    const plays = history.filter(h => h.timestamp >= dayStart && h.timestamp < dayEnd).length
    const d = new Date(dayStart)
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      plays: plays + Math.floor(Math.random() * 5) + 1,
    }
  })

  const shortTracks = mockTracks.filter(t => t.duration < 180).length
  const mediumTracks = mockTracks.filter(t => t.duration >= 180 && t.duration <= 300).length
  const longTracks = mockTracks.filter(t => t.duration > 300).length

  return {
    totalPlays: totalPlays + 42,
    totalFavorites,
    totalPlayTime: totalPlayTime + 86400,
    weeklyPlays,
    durationDistribution: [
      { name: '< 3分钟', value: shortTracks, color: '#22c55e' },
      { name: '3-5分钟', value: mediumTracks, color: '#f97316' },
      { name: '> 5分钟', value: longTracks, color: '#ef4444' },
    ],
  }
}
