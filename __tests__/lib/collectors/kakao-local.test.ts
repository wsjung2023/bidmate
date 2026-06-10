import { searchNearbyLodging, searchNearbyAttractions } from '@/lib/collectors/kakao-local'

const mockFetch = jest.fn()
global.fetch = mockFetch

const kakaoLodgingResponse = {
  meta: { total_count: 3, pageable_count: 3, is_end: true },
  documents: [
    { place_name: '속초 오션뷰 펜션', category_group_name: '숙박', x: '128.6', y: '38.2' },
    { place_name: '대명 리조트', category_group_name: '숙박', x: '128.62', y: '38.18' },
    { place_name: '설악 게스트하우스', category_group_name: '숙박', x: '128.58', y: '38.22' },
  ],
}

const kakaoAttractionResponse = {
  meta: { total_count: 5, pageable_count: 5, is_end: true },
  documents: [
    { place_name: '설악산국립공원', category_group_name: '관광명소', x: '128.47', y: '38.12' },
    { place_name: '속초해수욕장', category_group_name: '관광명소', x: '128.60', y: '38.21' },
  ],
}

beforeEach(() => {
  mockFetch.mockReset()
  process.env.KAKAO_REST_API_KEY = 'test-key'
})

describe('searchNearbyLodging', () => {
  test('반경 2km 내 숙박업체 수를 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => kakaoLodgingResponse,
    })

    const result = await searchNearbyLodging({ lat: 38.2, lng: 128.6, radiusM: 2000 })
    expect(result).not.toBeNull()
    expect(result!.count).toBe(3)
    expect(result!.places).toHaveLength(3)
    expect(result!.places[0].name).toBe('속초 오션뷰 펜션')
  })

  test('API 키 없으면 null 반환', async () => {
    delete process.env.KAKAO_REST_API_KEY
    const result = await searchNearbyLodging({ lat: 38.2, lng: 128.6, radiusM: 2000 })
    expect(result).toBeNull()
  })

  test('fetch 오류 시 null 반환 (파이프라인 중단 없음)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const result = await searchNearbyLodging({ lat: 38.2, lng: 128.6, radiusM: 2000 })
    expect(result).toBeNull()
  })
})

describe('searchNearbyAttractions', () => {
  test('반경 5km 내 관광명소 수를 반환한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => kakaoAttractionResponse,
    })

    const result = await searchNearbyAttractions({ lat: 38.2, lng: 128.6, radiusM: 5000 })
    expect(result).not.toBeNull()
    expect(result!.count).toBe(5)
  })
})
