export interface RawgGameResult {
  id: number
  name: string
  background_image?: string
  released?: string
  rating?: number
  genres?: Array<{ name: string }>
  platforms?: Array<{ platform: { name: string } }>
}

interface RawgResponse {
  results: RawgGameResult[]
}

function getApiKey(): string | null {
  const apiKey = import.meta.env.VITE_RAWG_API_KEY
  return apiKey ? String(apiKey) : null
}

export async function searchRawgGames(query: string): Promise<RawgGameResult[]> {
  const apiKey = getApiKey()
  if (!apiKey || !query.trim()) return []

  const params = new URLSearchParams({ key: apiKey, page_size: '8', search: query.trim() })
  const res = await fetch(`https://api.rawg.io/api/games?${params.toString()}`)
  if (!res.ok) throw new Error('Falha ao buscar na RAWG')

  const data = (await res.json()) as RawgResponse
  return data.results ?? []
}

export async function fetchRawgTrendingGames(): Promise<RawgGameResult[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - 2)

  const startDate = start.toISOString().slice(0, 10)
  const endDate = now.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    key: apiKey,
    page_size: '8',
    ordering: '-rating',
    dates: `${startDate},${endDate}`
  })

  const res = await fetch(`https://api.rawg.io/api/games?${params.toString()}`)
  if (!res.ok) return []

  const data = (await res.json()) as RawgResponse
  return data.results ?? []
}
