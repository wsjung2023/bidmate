# Phase 2B: 데이터 파이프라인 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 분석 품질을 높이기 위해 Kakao Local API로 실제 상권 데이터를 수집하고, 파이프라인 실행 전 투자기준 필터로 비용을 절감한다.

**Architecture:** `lib/collectors/kakao-local.ts`에 Kakao Local API 클라이언트를 구현하고, `commercial.ts` 에이전트가 이를 먼저 호출한 후 LLM에는 실제 데이터를 제공한다. 파이프라인 사전 필터는 `lib/pipeline/pre-filter.ts`로 분리하며, 크론 잡에서 분석 전에 호출한다.

**Tech Stack:** Kakao Local API REST (신규), 기존 Prisma/Next.js/Anthropic SDK

---

## 환경변수 전제조건

`KAKAO_REST_API_KEY` — Kakao Developers → 내 애플리케이션 → REST API 키  
(Phase 2A `.env.example`에 이미 추가됨)

---

## File Structure

```
lib/
  collectors/
    kakao-local.ts           (신규) Kakao Local API 클라이언트 (주변 숙박/관광지 검색)
  agents/
    commercial.ts            (수정) Kakao Local 데이터 → LLM 컨텍스트로 제공
  pipeline/
    pre-filter.ts            (신규) InvestmentCriteria 기반 매물 사전 필터

app/api/cron/daily/route.ts  (수정) 파이프라인 실행 전 pre-filter 적용

.env.example                 (기확인) KAKAO_REST_API_KEY 이미 Phase 2A에서 추가

__tests__/
  lib/collectors/kakao-local.test.ts  (신규)
  lib/pipeline/pre-filter.test.ts     (신규)
```

---

### Task 1: Kakao Local API 클라이언트

**Files:**
- Create: `lib/collectors/kakao-local.ts`
- Create: `__tests__/lib/collectors/kakao-local.test.ts`

Kakao Local API 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide

핵심 엔드포인트:
- `GET https://dapi.kakao.com/v2/local/search/keyword.json` — 키워드로 장소 검색
  - params: `query`, `x` (경도), `y` (위도), `radius` (미터), `category_group_code`, `size`
  - header: `Authorization: KakaoAK {REST_API_KEY}`
  - category_group_code: `AD5` = 숙박, `AT4` = 관광명소, `FD6` = 음식점

- [ ] **Step 1: 테스트 작성**

`__tests__/lib/collectors/kakao-local.test.ts`:

```ts
import { searchNearbyLodging, searchNearbyAttractions } from '@/lib/collectors/kakao-local'

// fetch 모킹
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
    expect(result.count).toBe(3)
    expect(result.places).toHaveLength(3)
    expect(result.places[0].name).toBe('속초 오션뷰 펜션')
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
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest __tests__/lib/collectors/kakao-local.test.ts --no-coverage
```

Expected: FAIL (파일 없음)

- [ ] **Step 3: kakao-local.ts 구현**

`lib/collectors/kakao-local.ts`:

```ts
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

// 반경 내 숙박업체 (경쟁자) 검색
export async function searchNearbyLodging(params: SearchParams): Promise<NearbySearchResult> {
  return kakaoSearch('숙박', params, 'AD5')
}

// 반경 내 관광명소 검색
export async function searchNearbyAttractions(params: SearchParams): Promise<NearbySearchResult> {
  return kakaoSearch('관광명소', params, 'AT4')
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/collectors/kakao-local.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/collectors/kakao-local.ts __tests__/lib/collectors/kakao-local.test.ts
git commit -m "feat: add kakao local api client for nearby lodging/attraction search"
```

---

### Task 2: commercial.ts — Kakao Local 데이터 연동

**Files:**
- Modify: `lib/agents/commercial.ts`
- Modify: `__tests__/lib/agents/commercial.test.ts`

- [ ] **Step 1: 기존 commercial 테스트 확인**

```bash
npx jest __tests__/lib/agents/commercial.test.ts --no-coverage
```

Expected: PASS (현재 통과 중인 테스트 확인)

- [ ] **Step 2: commercial.ts 교체**

`lib/agents/commercial.ts`:

```ts
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { CommercialArea } from './types'
import { searchNearbyLodging, searchNearbyAttractions } from '@/lib/collectors/kakao-local'

const CommercialSchema = z.object({
  touristProximityScore: z.number().min(0).max(100).describe('관광지 접근성 점수 (0-100)'),
  competitorCount: z.number().int().min(0).describe('반경 2km 내 유사 숙박업체 수'),
  occupancyRateBenchmark: z.number().min(0).max(100).describe('동일 지역 숙박업 평균 점유율 (%)'),
  averageDailyRate: z.number().min(0).describe('동일 등급 객실 평균 1박 요금 (KRW)'),
  summary: z.string().describe('상권 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 한국 숙박업 상권 분석 전문가다.
제공된 주변 실제 데이터(카카오맵 기반)를 최우선으로 활용하라.
카카오 데이터가 없을 경우 주소와 물건 종류로 추정 분석한다.
계절성(스키/여름 해수욕 등)과 지역 특성을 반드시 고려하라.`

export async function runCommercial(listing: Listing): Promise<CommercialArea> {
  // 좌표가 있으면 Kakao Local API로 실제 데이터 수집
  let kakaoContext = ''
  if (listing.latitude != null && listing.longitude != null) {
    const [lodging, attractions] = await Promise.all([
      searchNearbyLodging({ lat: listing.latitude, lng: listing.longitude, radiusM: 2000 }),
      searchNearbyAttractions({ lat: listing.latitude, lng: listing.longitude, radiusM: 5000 }),
    ])

    if (lodging != null) {
      kakaoContext += `\n[카카오맵 실측 데이터]`
      kakaoContext += `\n- 반경 2km 내 숙박업체: ${lodging.count}개`
      if (lodging.places.length > 0) {
        kakaoContext += `\n  주요 경쟁업체: ${lodging.places.slice(0, 5).map((p) => p.name).join(', ')}`
      }
    }
    if (attractions != null) {
      kakaoContext += `\n- 반경 5km 내 관광명소: ${attractions.count}개`
      if (attractions.places.length > 0) {
        kakaoContext += `\n  주요 관광지: ${attractions.places.slice(0, 5).map((p) => p.name).join(', ')}`
      }
    }
  }

  const prompt = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
${kakaoContext || '\n[좌표 없음 — 주소 기반 추정]'}

이 위치의 숙박업 상권을 분석하라. 관광지 접근성 점수(0-100), 경쟁업체 수, 시장 점유율, ADR을 포함하라.
`.trim()

  try {
    return await callLLMStructured(prompt, CommercialSchema, 'standard', SYSTEM)
  } catch (err) {
    throw new Error(`Commercial failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
```

- [ ] **Step 3: commercial.test.ts 업데이트**

`__tests__/lib/agents/commercial.test.ts` 에서 기존 mock이 있다면 `searchNearbyLodging` / `searchNearbyAttractions` 모킹 추가:

기존 파일을 읽고, `callLLMStructured` 모킹 다음에 다음을 추가:

```ts
// 기존 파일 상단에 추가
jest.mock('@/lib/collectors/kakao-local', () => ({
  searchNearbyLodging: jest.fn().mockResolvedValue({ count: 3, places: [{ name: '테스트 펜션', lat: 37.5, lng: 127.0 }] }),
  searchNearbyAttractions: jest.fn().mockResolvedValue({ count: 7, places: [{ name: '설악산', lat: 37.7, lng: 128.4 }] }),
}))
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/agents/commercial.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
git add lib/agents/commercial.ts __tests__/lib/agents/commercial.test.ts
git commit -m "feat: wire kakao local api into commercial agent for real competitor/attraction data"
```

---

### Task 3: 파이프라인 사전 필터 (비용 최적화)

**Files:**
- Create: `lib/pipeline/pre-filter.ts`
- Create: `__tests__/lib/pipeline/pre-filter.test.ts`
- Modify: `app/api/cron/daily/route.ts`

**현황:** 크론 잡이 `isDropped: false, score: null` 인 매물을 최대 50개 가져와 모두 AI 분석함.
**문제:** 사용자 투자기준(지역, 예산, 물건 종류)에 맞지 않는 매물도 분석 → 비용 낭비.
**해결:** 분석 전에 어떤 사용자의 투자기준에도 맞지 않는 매물은 건너뜀. 투자기준 없으면 모두 분석.

- [ ] **Step 1: pre-filter 테스트 작성**

`__tests__/lib/pipeline/pre-filter.test.ts`:

```ts
import { matchesAnyCriteria } from '@/lib/pipeline/pre-filter'
import type { Listing } from '@prisma/client'
import type { InvestmentCriteria } from '@prisma/client'

const baseListing: Listing = {
  id: 'listing-1',
  externalId: null,
  source: 'court_auction',
  address: '강원도 평창군 대관령면 올림픽로 715',
  addressDetail: null,
  propertyType: 'PENSION',
  listingType: 'AUCTION',
  minimumBid: BigInt(230_000_000),
  appraisalValue: BigInt(310_000_000),
  area: 150,
  auctionDate: null,
  auctionCount: 0,
  court: '춘천지법',
  caseNumber: null,
  latitude: null,
  longitude: null,
  floorInfo: null,
  buildYear: null,
  rawData: null,
  score: null,
  isDropped: false,
  droppedReason: null,
  collectedAt: new Date(),
  updatedAt: new Date(),
}

const baseCriteria: InvestmentCriteria = {
  id: 'criteria-1',
  userId: 'user-1',
  regions: [],
  minBid: null,
  maxBid: null,
  minArea: null,
  maxArea: null,
  propertyTypes: [],
  listingTypes: [],
  minRoi: null,
  minScore: 60,
  telegramChatId: null,
  notifyEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('matchesAnyCriteria', () => {
  test('기준 없으면 true 반환 (모든 매물 분석)', () => {
    expect(matchesAnyCriteria(baseListing, [])).toBe(true)
  })

  test('지역 기준 일치 → true', () => {
    const criteria = { ...baseCriteria, regions: ['강원'] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('지역 기준 불일치 → false', () => {
    const criteria = { ...baseCriteria, regions: ['제주'] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('예산 범위 내 → true', () => {
    const criteria = {
      ...baseCriteria,
      minBid: BigInt(200_000_000),
      maxBid: BigInt(300_000_000),
    }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('예산 초과 → false', () => {
    const criteria = {
      ...baseCriteria,
      minBid: BigInt(100_000_000),
      maxBid: BigInt(200_000_000),
    }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('물건 종류 일치 → true', () => {
    const criteria = { ...baseCriteria, propertyTypes: ['PENSION' as any] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('물건 종류 불일치 → false', () => {
    const criteria = { ...baseCriteria, propertyTypes: ['HOTEL' as any] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('여러 사용자 중 하나라도 기준 일치 → true', () => {
    const criteriaA = { ...baseCriteria, id: 'a', regions: ['제주'] }
    const criteriaB = { ...baseCriteria, id: 'b', regions: ['강원'] }
    expect(matchesAnyCriteria(baseListing, [criteriaA, criteriaB])).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest __tests__/lib/pipeline/pre-filter.test.ts --no-coverage
```

Expected: FAIL (파일 없음)

- [ ] **Step 3: pre-filter.ts 구현**

`lib/pipeline/pre-filter.ts`:

```ts
import type { Listing, InvestmentCriteria } from '@prisma/client'

// listing이 criteria의 조건과 매칭되는지 확인
function matchesCriteria(listing: Listing, criteria: InvestmentCriteria): boolean {
  // 지역 필터 (비어있으면 전체 허용)
  if (criteria.regions.length > 0) {
    const addressLower = listing.address.toLowerCase()
    const regionMatch = criteria.regions.some((r) => addressLower.includes(r.toLowerCase()))
    if (!regionMatch) return false
  }

  // 예산 필터
  const bid = Number(listing.minimumBid)
  if (criteria.minBid != null && bid < Number(criteria.minBid)) return false
  if (criteria.maxBid != null && bid > Number(criteria.maxBid)) return false

  // 물건 종류 필터 (비어있으면 전체 허용)
  if (criteria.propertyTypes.length > 0) {
    if (!criteria.propertyTypes.includes(listing.propertyType as any)) return false
  }

  // 매물 유형 필터 (비어있으면 전체 허용)
  if (criteria.listingTypes.length > 0) {
    if (!criteria.listingTypes.includes(listing.listingType as any)) return false
  }

  return true
}

// 어느 사용자의 기준이라도 매칭되면 true
// 기준 자체가 없으면 true (필터 없음 = 모두 분석)
export function matchesAnyCriteria(
  listing: Listing,
  allCriteria: InvestmentCriteria[],
): boolean {
  if (allCriteria.length === 0) return true
  return allCriteria.some((c) => matchesCriteria(listing, c))
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/pipeline/pre-filter.test.ts --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: 크론 잡에 pre-filter 적용**

`app/api/cron/daily/route.ts`의 매물 조회 부분 수정:

기존:
```ts
const listings = await prisma.listing.findMany({
  where: { isDropped: false, score: null },
  orderBy: { collectedAt: 'desc' },
  take: 50,
})
```

교체:
```ts
// 모든 사용자의 투자기준 로드
const allCriteria = await prisma.investmentCriteria.findMany()

// 미분석 매물 전체 (최대 200개) 로드 후 필터링
const candidates = await prisma.listing.findMany({
  where: { isDropped: false, score: null },
  orderBy: [{ collectedAt: 'desc' }],
  take: 200,
})

const listings = candidates.filter((l) => matchesAnyCriteria(l, allCriteria)).slice(0, 50)
```

그리고 파일 상단 import에 추가:
```ts
import { matchesAnyCriteria } from '@/lib/pipeline/pre-filter'
```

- [ ] **Step 6: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 7: 전체 테스트 실행**

```bash
npx jest --passWithNoTests --no-coverage
```

Expected: 모두 통과

- [ ] **Step 8: Commit**

```bash
git add lib/pipeline/pre-filter.ts __tests__/lib/pipeline/pre-filter.test.ts app/api/cron/daily/route.ts
git commit -m "feat: add pipeline pre-filter based on investment criteria to reduce AI costs"
```

---

### Task 4: Normalizer 모델 재조정

**Files:**
- Modify: `lib/agents/normalizer.ts`
- Modify: `lib/llm/client.ts` (필요 시)

**배경:** 이전에 Haiku 모델을 `'standard'`(Sonnet)으로 업그레이드했다. Normalizer는 단순 구조화 작업(요약, 비용 추정)이므로 `'fast'`(Haiku)로도 충분하다. Haiku가 "거지같다"는 평가는 모델 ID가 틀렸기 때문이었고(claude-haiku-4-5 → 수정: claude-haiku-4-5-20251001), 지금은 올바른 ID가 등록되어 있다. 비용 절감을 위해 fast tier로 복원한다.

- [ ] **Step 1: 현재 client.ts 확인 (올바른 Haiku ID 확인)**

```bash
npx grep -n "haiku" lib/llm/client.ts
```

Expected output:
```
3:  fast: 'claude-haiku-4-5-20251001',
```

ID가 `claude-haiku-4-5-20251001`이면 올바름. 만약 `claude-haiku-4-5`이면 수정 필요.

- [ ] **Step 2: normalizer.ts fast tier로 복원**

`lib/agents/normalizer.ts` line 36:

```ts
// 변경 전
const output = await callLLMStructured(prompt, NormalizerOutputSchema, 'standard')

// 변경 후
const output = await callLLMStructured(prompt, NormalizerOutputSchema, 'fast')
```

이 변경으로 normalizer 1회당 비용: $0.03 → $0.01 (Sonnet → Haiku, 3배 절감)

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx jest __tests__/lib/agents/normalizer.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/agents/normalizer.ts
git commit -m "perf: revert normalizer to fast (haiku) tier — model id now correct"
```

---

## Self-Review

**Spec coverage:**
- ✅ Kakao Local API로 실제 상권 데이터 수집 (Task 1)
- ✅ commercial.ts에 실제 데이터 연동 (Task 2)
- ✅ 파이프라인 사전 필터로 비용 절감 (Task 3)
- ✅ Normalizer 모델 최적화 (Task 4)
- ⚠️ 법원경매 상세 API: 이 계획에서 제외 (엔드포인트 미발견, 별도 조사 필요)

**Placeholder 없음 확인:**
- 모든 Step에 완전한 코드 포함 ✅

**Type consistency:**
- `matchesAnyCriteria(listing: Listing, allCriteria: InvestmentCriteria[])` — Task 3에서 정의 후 route.ts에서 동일 시그니처로 사용 ✅
- `searchNearbyLodging/searchNearbyAttractions` — Task 1에서 정의, Task 2에서 동일 import 사용 ✅
