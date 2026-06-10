const KAKAO_LOCAL_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json'

type KakaoPlace = {
  place_name: string
  category_group_name: string
  x: string
  y: string
  road_address_name?: string
  address_name?: string
}

type KakaoLocalResponse = {
  meta: { total_count: number; pageable_count: number; is_end: boolean }
  documents: KakaoPlace[]
}

type SearchParams = {
  lat: number
  lng: number
  radiusM: number
}

export type NearbySearchResult = {
  count: number
  places: Array<{ name: string; lat: number; lng: number }>
} | null

async function kakaoSearch(
  query: string,
  { lat, lng, radiusM }: SearchParams,
  categoryGroupCode: string,
): Promise<NearbySearchResult> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radiusM),
    category_group_code: categoryGroupCode,
    size: '15',
  })

  try {
    const res = await fetch(`${KAKAO_LOCAL_URL}?${params}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    })
    if (!res.ok) return null

    const data: KakaoLocalResponse = await res.json()
    return {
      count: data.meta.total_count,
      places: data.documents.map((d) => ({
        name: d.place_name,
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
      })),
    }
  } catch {
    return null
  }
}

export async function searchNearbyLodging(params: SearchParams): Promise<NearbySearchResult> {
  return kakaoSearch('숙박', params, 'AD5')
}

export async function searchNearbyAttractions(params: SearchParams): Promise<NearbySearchResult> {
  return kakaoSearch('관광명소', params, 'AT4')
}
