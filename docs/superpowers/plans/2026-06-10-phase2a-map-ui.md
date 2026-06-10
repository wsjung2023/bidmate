# Phase 2A: 카카오맵 + UI/UX 전면 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지지옥션/탱크옥션을 능가하는 귀여운 UI와 카카오맵 기반 지도뷰(리스트+맵 분할화면)를 구현한다.

**Architecture:** 공통 `components/` 디렉토리에 재사용 가능한 `ListingCard`, `ScoreBadge` 컴포넌트를 만들고, 기존 모든 페이지에서 사용한다. 지도 페이지는 서버 컴포넌트(데이터 fetch) + 클라이언트 컴포넌트(Kakao Maps) 패턴으로 구성한다. 마커는 react-kakao-maps-sdk의 `CustomOverlayMap`으로 커스텀 HTML 렌더링한다.

**Tech Stack:** react-kakao-maps-sdk (신규), Tailwind CSS 4 (기존), Next.js App Router (기존), Kakao Maps JavaScript SDK

---

## 환경변수 전제조건

이 계획을 실행하기 전에 다음 두 가지 키가 필요하다:
- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → JavaScript 키
- `KAKAO_REST_API_KEY` — 같은 앱의 REST API 키 (Phase 2B에서 사용)

키는 `.env.local`과 Vercel 환경변수에 추가한다.

---

## File Structure

```
components/
  ListingCard.tsx          (신규) 재사용 가능한 매물 카드 (귀여운 디자인)
  ui/
    ScoreBadge.tsx         (신규) 점수 배지 컴포넌트

app/(dashboard)/
  layout.tsx               (수정) BidMate 브랜딩, 새 네비게이션, 지도 링크
  dashboard/page.tsx       (수정) 통계 카드 + ListingCard 그리드 리뉴얼
  listings/page.tsx        (수정) ListingCard 그리드 뷰로 교체
  listings/[id]/page.tsx   (수정) 상세 페이지 디자인 개선
  map/
    page.tsx               (신규) 서버: 좌표 있는 매물 fetch
    MapView.tsx            (신규) 클라이언트: Kakao Maps + 마커 + 사이드패널

lib/labels.ts              (수정) PROPERTY_ICONS 추가
app/globals.css            (수정) 디자인 토큰 CSS 변수 추가
package.json               (수정) react-kakao-maps-sdk 추가
.env.example               (수정) 카카오 키 추가

__tests__/
  components/
    ListingCard.test.tsx   (신규)
    ScoreBadge.test.tsx    (신규)
  app/(dashboard)/map/
    MapView.test.tsx       (신규)
```

---

### Task 1: 패키지 설치 + 환경변수

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: react-kakao-maps-sdk 설치**

```bash
npm install react-kakao-maps-sdk
```

Expected output:
```
added 1 package ...
```

- [ ] **Step 2: .env.example에 카카오 키 추가**

현재 `.env.example`의 마지막 부분에 다음을 추가:

```bash
# ─── Kakao Maps ──────────────────────────────────────────────────────────────
# https://developers.kakao.com → 내 애플리케이션 → 앱 설정 → 앱 키
NEXT_PUBLIC_KAKAO_MAP_APP_KEY="your-kakao-javascript-app-key"
KAKAO_REST_API_KEY="your-kakao-rest-api-key"
```

- [ ] **Step 3: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add react-kakao-maps-sdk and kakao env vars"
```

---

### Task 2: 디자인 시스템 + labels.ts 업데이트

**Files:**
- Modify: `app/globals.css`
- Modify: `lib/labels.ts`

- [ ] **Step 1: globals.css에 디자인 토큰 추가**

`app/globals.css`의 기존 내용을 다음으로 교체 (기존 `@import "tailwindcss"` 줄은 유지):

```css
@import "tailwindcss";

:root {
  --radius-card: 1rem;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* Kakao Map overlay 기본 패딩 제거 */
.kakao-overlay-container {
  padding: 0 !important;
  background: none !important;
  border: none !important;
}
```

- [ ] **Step 2: lib/labels.ts에 PROPERTY_ICONS 추가**

`lib/labels.ts` 전체를 다음으로 교체:

```ts
export const LISTING_TYPE_LABEL: Record<string, string> = {
  AUCTION: '경매',
  PUBLIC_SALE: '공매',
  LODGING_LEASE: '숙박임차',
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  HOTEL: '호텔',
  PENSION: '펜션',
  GUESTHOUSE: '게스트하우스',
  MOTEL: '모텔',
  RESORT: '리조트',
  BUILDING: '건물',
  LAND: '토지',
  OTHER: '기타',
}

export const PROPERTY_ICONS: Record<string, string> = {
  HOTEL: '🏨',
  PENSION: '🏡',
  GUESTHOUSE: '🏠',
  MOTEL: '🏩',
  RESORT: '🌴',
  BUILDING: '🏢',
  LAND: '🌿',
  OTHER: '📍',
}
```

- [ ] **Step 3: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add app/globals.css lib/labels.ts
git commit -m "feat: add design tokens and property type icons"
```

---

### Task 3: ScoreBadge + ListingCard 공통 컴포넌트

**Files:**
- Create: `components/ui/ScoreBadge.tsx`
- Create: `components/ListingCard.tsx`
- Create: `__tests__/components/ScoreBadge.test.tsx`
- Create: `__tests__/components/ListingCard.test.tsx`

- [ ] **Step 1: ScoreBadge 테스트 작성**

`__tests__/components/ScoreBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

describe('ScoreBadge', () => {
  test('고점수(≥70) → 녹색 배지', () => {
    render(<ScoreBadge score={85} />)
    const badge = screen.getByText('85점')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('emerald')
  })

  test('중점수(50-69) → 주황 배지', () => {
    render(<ScoreBadge score={62} />)
    const badge = screen.getByText('62점')
    expect(badge.className).toContain('amber')
  })

  test('저점수(<50) → 빨간 배지', () => {
    render(<ScoreBadge score={40} />)
    expect(screen.getByText('40점').className).toContain('red')
  })

  test('미분석(null) → 회색 배지', () => {
    render(<ScoreBadge score={null} />)
    expect(screen.getByText('미분석')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest __tests__/components/ScoreBadge.test.tsx --no-coverage
```

Expected: FAIL (파일 없음)

- [ ] **Step 3: ScoreBadge 컴포넌트 구현**

`components/ui/ScoreBadge.tsx`:

```tsx
export function ScoreBadge({ score, size = 'sm' }: { score: number | null; size?: 'sm' | 'lg' }) {
  const base = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'

  if (score === null) {
    return (
      <span className={`${base} font-medium text-slate-400 bg-slate-100 rounded-full`}>
        미분석
      </span>
    )
  }

  const colorCls =
    score >= 70
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 50
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-600'

  return (
    <span className={`${base} font-bold rounded-full ${colorCls}`}>
      {score}점
    </span>
  )
}
```

- [ ] **Step 4: ScoreBadge 테스트 통과 확인**

```bash
npx jest __tests__/components/ScoreBadge.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: ListingCard 테스트 작성**

`__tests__/components/ListingCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ListingCard } from '@/components/ListingCard'

const mockListing = {
  id: 'test-id',
  externalId: null,
  source: 'court_auction',
  address: '강원도 평창군 대관령면 올림픽로 715',
  addressDetail: null,
  propertyType: 'PENSION' as const,
  listingType: 'AUCTION' as const,
  minimumBid: BigInt(230_000_000),
  appraisalValue: BigInt(310_000_000),
  area: 150,
  auctionDate: new Date('2026-07-15'),
  auctionCount: 3,
  court: '춘천지법',
  caseNumber: '2026타경1234',
  score: 85,
  isDropped: false,
  droppedReason: null,
  floorInfo: null,
  buildYear: null,
  latitude: null,
  longitude: null,
  rawData: null,
  collectedAt: new Date(),
  updatedAt: new Date(),
}

describe('ListingCard', () => {
  test('가격을 억 단위로 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('2.3억')).toBeInTheDocument()
  })

  test('할인율 계산 및 표시', () => {
    render(<ListingCard listing={mockListing} />)
    // (310-230)/310 = 25.8% → 26%
    expect(screen.getByText('26% 할인')).toBeInTheDocument()
  })

  test('유찰 횟수 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('3회 유찰')).toBeInTheDocument()
  })

  test('점수 배지 렌더링', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('85점')).toBeInTheDocument()
  })

  test('주소 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText(/강원도 평창군/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: 테스트 실행 (실패 확인)**

```bash
npx jest __tests__/components/ListingCard.test.tsx --no-coverage
```

Expected: FAIL (파일 없음)

- [ ] **Step 7: ListingCard 컴포넌트 구현**

`components/ListingCard.tsx`:

```tsx
import Link from 'next/link'
import type { Listing } from '@prisma/client'
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL, PROPERTY_ICONS } from '@/lib/labels'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

export function ListingCard({ listing }: { listing: Listing }) {
  const icon = PROPERTY_ICONS[listing.propertyType] ?? '📍'
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
  const appraisalEok = (Number(listing.appraisalValue) / 1e8).toFixed(1)
  const discount = Math.round(
    ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100,
  )

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
    >
      {/* Header: 아이콘 + 태그 + 점수 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{icon}</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            <span className="text-xs text-slate-500">
              {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
            </span>
          </div>
        </div>
        <ScoreBadge score={listing.score} />
      </div>

      {/* 주소 */}
      <p className="text-sm font-semibold text-slate-800 mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">
        {listing.address}
      </p>

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
        {listing.area && (
          <span>{listing.area.toFixed(0)}m² ({(listing.area / 3.306).toFixed(0)}평)</span>
        )}
        {listing.auctionDate && (
          <span>
            경매{' '}
            {listing.auctionDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          </span>
        )}
        {listing.auctionCount > 0 && (
          <span className="text-orange-500 font-medium">{listing.auctionCount}회 유찰</span>
        )}
        {listing.court && <span>{listing.court}</span>}
      </div>

      {/* 가격 행 */}
      <div className="flex items-end justify-between pt-3 border-t border-slate-100">
        <div>
          <p className="text-xl font-bold text-slate-900 leading-none">{priceEok}억</p>
          <p className="text-xs text-slate-400 mt-1">감정가 {appraisalEok}억</p>
        </div>
        {discount > 0 && (
          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            {discount}% 할인
          </span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 8: ListingCard 테스트 통과 확인**

```bash
npx jest __tests__/components/ListingCard.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add components/ __tests__/components/
git commit -m "feat: add ScoreBadge and ListingCard shared components"
```

---

### Task 4: 네비게이션 리뉴얼 (BidMate 브랜딩)

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: layout.tsx 전체 교체**

`app/(dashboard)/layout.tsx`:

```tsx
import { auth, signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/listings', label: '매물 목록' },
  { href: '/map', label: '지도 보기' },
  { href: '/reports', label: '보고서' },
  { href: '/settings', label: '설정' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 브랜드 */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <span className="font-bold text-slate-900 text-base">BidMate</span>
            </Link>

            {/* 네비게이션 링크 */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 우측: 사용자 + 로그아웃 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-slate-200"
                />
              )}
              <span className="text-sm text-slate-500 max-w-[160px] truncate">
                {session.user.name ?? session.user.email}
              </span>
            </div>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button
                type="submit"
                className="text-sm text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add app/'(dashboard)'/layout.tsx
git commit -m "feat: rebrand to BidMate with new navigation"
```

---

### Task 5: 카카오맵 지도뷰 페이지 (리스트 + 맵 분할화면)

**Files:**
- Create: `app/(dashboard)/map/page.tsx`
- Create: `app/(dashboard)/map/MapView.tsx`
- Create: `__tests__/app/(dashboard)/map/MapView.test.tsx`

- [ ] **Step 1: MapView 테스트 작성**

`__tests__/app/(dashboard)/map/MapView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MapView } from '@/app/(dashboard)/map/MapView'

// react-kakao-maps-sdk mock
jest.mock('react-kakao-maps-sdk', () => ({
  useKakaoLoader: () => [false, undefined],
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="kakao-map">{children}</div>
  ),
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-overlay">{children}</div>
  ),
}))

const mockListings = [
  {
    id: '1',
    address: '강원도 강릉시 주문진읍 해안로 1',
    propertyType: 'PENSION',
    listingType: 'AUCTION',
    minimumBid: BigInt(200_000_000),
    appraisalValue: BigInt(280_000_000),
    area: 120,
    auctionDate: null,
    auctionCount: 0,
    court: '춘천지법',
    latitude: 37.9,
    longitude: 128.9,
    score: 72,
  },
  {
    id: '2',
    address: '제주특별자치도 서귀포시 색달동 1234',
    propertyType: 'GUESTHOUSE',
    listingType: 'AUCTION',
    minimumBid: BigInt(150_000_000),
    appraisalValue: BigInt(200_000_000),
    area: 80,
    auctionDate: null,
    auctionCount: 1,
    court: '제주지법',
    latitude: 33.2,
    longitude: 126.5,
    score: null,
  },
]

test('지도와 매물 목록 패널을 렌더링한다', () => {
  render(<MapView listings={mockListings as any} />)
  expect(screen.getByTestId('kakao-map')).toBeInTheDocument()
  expect(screen.getByText(/강원도 강릉시/)).toBeInTheDocument()
  expect(screen.getByText(/제주특별자치도/)).toBeInTheDocument()
})

test('좌표 없는 매물은 지도 마커를 생성하지 않는다', () => {
  const noCoordListings = [{ ...mockListings[0], latitude: null, longitude: null }]
  render(<MapView listings={noCoordListings as any} />)
  expect(screen.queryByTestId('map-overlay')).not.toBeInTheDocument()
})

test('매물 카운트를 표시한다', () => {
  render(<MapView listings={mockListings as any} />)
  expect(screen.getByText(/2건/)).toBeInTheDocument()
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx jest "__tests__/app/(dashboard)/map" --no-coverage
```

Expected: FAIL (파일 없음)

- [ ] **Step 3: MapView 클라이언트 컴포넌트 구현**

`app/(dashboard)/map/MapView.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk'
import Link from 'next/link'
import { PROPERTY_ICONS, PROPERTY_TYPE_LABEL, LISTING_TYPE_LABEL } from '@/lib/labels'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

// 법원경매 API가 주는 좌표 포함한 경량 타입
export type MapListing = {
  id: string
  address: string
  propertyType: string
  listingType: string
  minimumBid: bigint
  appraisalValue: bigint
  area: number | null
  auctionDate: Date | null
  auctionCount: number
  court: string | null
  latitude: number | null
  longitude: number | null
  score: number | null
}

const PROPERTY_ICONS_MAP = PROPERTY_ICONS

// 마커 컴포넌트 (인라인 스타일 사용 — Kakao overlay CSS isolation 대응)
function MarkerCard({
  listing,
  selected,
  onClick,
}: {
  listing: MapListing
  selected: boolean
  onClick: () => void
}) {
  const score = listing.score
  const accent =
    score == null ? '#94A3B8' : score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  const icon = PROPERTY_ICONS_MAP[listing.propertyType] ?? '📍'
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)

  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', userSelect: 'none', transform: 'translateY(-100%)', marginBottom: 8 }}
    >
      <div
        style={{
          background: selected ? accent : 'white',
          border: `2.5px solid ${accent}`,
          borderRadius: 12,
          padding: '5px 9px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          boxShadow: selected ? `0 4px 20px ${accent}40` : '0 2px 8px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          position: 'relative',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: selected ? 'white' : '#1E293B',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {priceEok}억
        </span>
        {score != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'white',
              background: selected ? 'rgba(255,255,255,0.3)' : accent,
              borderRadius: 20,
              padding: '1px 5px',
            }}
          >
            {score}
          </span>
        )}
        {/* 꼬리 삼각형 */}
        <div
          style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 10,
            height: 10,
            background: selected ? accent : 'white',
            borderRight: `2.5px solid ${accent}`,
            borderBottom: `2.5px solid ${accent}`,
          }}
        />
      </div>
    </div>
  )
}

// 선택된 매물의 사이드 패널
function ListingPanel({ listing, onClose }: { listing: MapListing; onClose: () => void }) {
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
  const appraisalEok = (Number(listing.appraisalValue) / 1e8).toFixed(1)
  const discount = Math.round(
    ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100,
  )
  const icon = PROPERTY_ICONS_MAP[listing.propertyType] ?? '📍'

  return (
    <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-50 to-white px-4 py-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      {/* 내용 */}
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800 mb-3 leading-snug">{listing.address}</p>

        {/* 가격 */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{priceEok}억</p>
            <p className="text-xs text-slate-400 mt-1">감정가 {appraisalEok}억</p>
          </div>
          <div className="text-right">
            {discount > 0 && (
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                {discount}% 할인
              </span>
            )}
            <div className="mt-1">
              <ScoreBadge score={listing.score} />
            </div>
          </div>
        </div>

        {/* 메타 */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
          {listing.area && <span>{listing.area.toFixed(0)}m²</span>}
          {listing.auctionCount > 0 && (
            <span className="text-orange-500">{listing.auctionCount}회 유찰</span>
          )}
          {listing.court && <span>{listing.court}</span>}
        </div>

        <Link
          href={`/listings/${listing.id}`}
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          상세 보기 →
        </Link>
      </div>
    </div>
  )
}

export function MapView({ listings }: { listings: MapListing[] }) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? '',
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const mappableListings = listings.filter((l) => l.latitude != null && l.longitude != null)
  const selectedListing = listings.find((l) => l.id === selectedId) ?? null

  // 지도 중심: 수집된 매물의 중심점, 없으면 한국 중앙
  const center =
    mappableListings.length > 0
      ? {
          lat: mappableListings.reduce((s, l) => s + l.latitude!, 0) / mappableListings.length,
          lng: mappableListings.reduce((s, l) => s + l.longitude!, 0) / mappableListings.length,
        }
      : { lat: 36.5, lng: 127.9 }

  const filteredListings = searchQuery
    ? listings.filter((l) => l.address.toLowerCase().includes(searchQuery.toLowerCase()))
    : listings

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-100 rounded-2xl">
        <p className="text-slate-500 text-sm">지도를 불러올 수 없습니다. API 키를 확인하세요.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* 좌측: 매물 리스트 패널 */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        <div className="sticky top-0 bg-slate-50 pb-2 z-10">
          <input
            type="text"
            placeholder="주소 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1 px-1">{filteredListings.length}건</p>
        </div>

        {filteredListings.map((listing) => {
          const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
          const discount = Math.round(
            ((Number(listing.appraisalValue) - Number(listing.minimumBid)) /
              Number(listing.appraisalValue)) *
              100,
          )
          const isSelected = listing.id === selectedId
          const icon = PROPERTY_ICONS_MAP[listing.propertyType] ?? '📍'

          return (
            <button
              key={listing.id}
              onClick={() => setSelectedId(isSelected ? null : listing.id)}
              className={`w-full text-left bg-white rounded-2xl border-2 p-3 transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-400 shadow-md bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs text-slate-500">
                    {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                  </span>
                </div>
                <ScoreBadge score={listing.score} />
              </div>
              <p className="text-xs font-medium text-slate-700 line-clamp-1 mb-1.5">
                {listing.address}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{priceEok}억</span>
                {discount > 0 && (
                  <span className="text-xs font-bold text-indigo-600">{discount}% 할인</span>
                )}
              </div>
            </button>
          )
        })}

        {filteredListings.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">검색 결과 없음</p>
        )}
      </div>

      {/* 우측: 카카오맵 */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-200">
        {loading ? (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <div className="text-slate-400 text-sm flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              지도 로딩 중...
            </div>
          </div>
        ) : (
          <Map center={center} style={{ width: '100%', height: '100%' }} level={8}>
            {mappableListings.map((listing) => (
              <CustomOverlayMap
                key={listing.id}
                position={{ lat: listing.latitude!, lng: listing.longitude! }}
                yAnchor={1.25}
              >
                <MarkerCard
                  listing={listing}
                  selected={listing.id === selectedId}
                  onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)}
                />
              </CustomOverlayMap>
            ))}
          </Map>
        )}

        {/* 선택된 매물 패널 */}
        {selectedListing && (
          <ListingPanel listing={selectedListing} onClose={() => setSelectedId(null)} />
        )}

        {/* 지도 위 통계 칩 */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200">
            📍 {mappableListings.length}건 표시
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: map/page.tsx 서버 컴포넌트 구현**

`app/(dashboard)/map/page.tsx`:

```tsx
import { prisma } from '@/lib/db/prisma'
import { MapView } from './MapView'

export default async function MapPage() {
  const listings = await prisma.listing.findMany({
    where: { isDropped: false },
    select: {
      id: true,
      address: true,
      propertyType: true,
      listingType: true,
      minimumBid: true,
      appraisalValue: true,
      area: true,
      auctionDate: true,
      auctionCount: true,
      court: true,
      latitude: true,
      longitude: true,
      score: true,
    },
    orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }],
    take: 500,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          지도 보기{' '}
          <span className="text-slate-400 text-xl font-normal">({listings.length}건)</span>
        </h1>
      </div>
      <MapView listings={listings as any} />
    </div>
  )
}
```

- [ ] **Step 5: MapView 테스트 통과 확인**

```bash
npx jest "__tests__/app/(dashboard)/map" --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/map/" "__tests__/app/(dashboard)/map/"
git commit -m "feat: add kakao map view with custom property markers"
```

---

### Task 6: 매물 목록 페이지 리뉴얼

**Files:**
- Modify: `app/(dashboard)/listings/page.tsx`

- [ ] **Step 1: listings/page.tsx 교체**

`app/(dashboard)/listings/page.tsx`:

```tsx
import { prisma } from '@/lib/db/prisma'
import { ListingType, PropertyType, Prisma } from '@prisma/client'
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/labels'
import { ListingsFilter } from './ListingsFilter'
import { ListingCard } from '@/components/ListingCard'
import { Suspense } from 'react'
import Link from 'next/link'

const VALID_TYPES = new Set<string>(['AUCTION', 'PUBLIC_SALE', 'LODGING_LEASE'])
const VALID_PROPERTY_TYPES = new Set<string>([
  'HOTEL', 'PENSION', 'GUESTHOUSE', 'MOTEL', 'RESORT', 'BUILDING', 'LAND', 'OTHER',
])

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    type?: string
    propertyType?: string
    q?: string
    score?: string
    sort?: string
    dropped?: string
  }>
}) {
  const {
    page: pageStr,
    type: typeParam,
    propertyType: propTypeParam,
    q,
    score,
    sort,
    dropped: droppedStr,
  } = await searchParams

  const page = Math.max(1, parseInt(pageStr ?? '1') || 1)
  const dropped = droppedStr === 'true'

  const type: ListingType | null =
    typeParam && VALID_TYPES.has(typeParam) ? (typeParam as ListingType) : null
  const propType: PropertyType | null =
    propTypeParam && VALID_PROPERTY_TYPES.has(propTypeParam)
      ? (propTypeParam as PropertyType)
      : null

  const where: Prisma.ListingWhereInput = {
    isDropped: dropped,
    ...(type && { listingType: type }),
    ...(propType && { propertyType: propType }),
    ...(q && { address: { contains: q, mode: 'insensitive' } }),
    ...(score === 'analyzed' && { score: { not: null } }),
    ...(score === 'high' && { score: { gte: 70 } }),
    ...(score === 'mid' && { score: { gte: 50, lt: 70 } }),
    ...(score === 'low' && { score: { lt: 50, not: null } }),
    ...(score === 'none' && { score: null }),
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === 'recent'
      ? [{ collectedAt: 'desc' }]
      : sort === 'bid_asc'
        ? [{ minimumBid: 'asc' }]
        : sort === 'bid_desc'
          ? [{ minimumBid: 'desc' }]
          : [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }]

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy, skip: (page - 1) * 20, take: 20 }),
    prisma.listing.count({ where }),
  ])

  const totalPages = Math.ceil(total / 20)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (typeParam) params.set('type', typeParam)
    if (propTypeParam) params.set('propertyType', propTypeParam)
    if (q) params.set('q', q)
    if (score) params.set('score', score)
    if (sort) params.set('sort', sort)
    if (droppedStr) params.set('dropped', droppedStr)
    const s = params.toString()
    return `/listings${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          매물 목록{' '}
          <span className="text-slate-400 text-xl font-normal">({total}건)</span>
        </h1>
        <Link
          href="/map"
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          🗺️ 지도 보기
        </Link>
      </div>

      <Suspense>
        <ListingsFilter />
      </Suspense>

      {/* 그리드 레이아웃 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-400 text-sm">해당하는 매물이 없습니다</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600"
            >
              이전
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/listings/page.tsx"
git commit -m "feat: redesign listings page with card grid layout"
```

---

### Task 7: 대시보드 리뉴얼

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: dashboard/page.tsx 교체**

`app/(dashboard)/dashboard/page.tsx`:

```tsx
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { ListingCard } from '@/components/ListingCard'

export default async function DashboardPage() {
  const [total, analyzed, highScore, dropped, recentCollected] = await Promise.all([
    prisma.listing.count({ where: { isDropped: false } }),
    prisma.listing.count({ where: { score: { not: null }, isDropped: false } }),
    prisma.listing.count({ where: { score: { gte: 70 }, isDropped: false } }),
    prisma.listing.count({ where: { isDropped: true } }),
    prisma.listing.count({
      where: {
        isDropped: false,
        collectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const recent = await prisma.listing.findMany({
    where: { isDropped: false },
    orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }],
    take: 8,
  })

  const STATS = [
    {
      label: '전체 매물',
      value: total,
      sub: `오늘 +${recentCollected}건`,
      color: 'text-slate-900',
      bg: 'bg-slate-50',
      icon: '🏠',
    },
    {
      label: '분석 완료',
      value: analyzed,
      sub: `${total > 0 ? Math.round((analyzed / total) * 100) : 0}% 완료`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      icon: '🤖',
    },
    {
      label: '고점수 매물',
      value: highScore,
      sub: '70점 이상',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: '⭐',
    },
    {
      label: '분석 제외',
      value: dropped,
      sub: '조건 미달',
      color: 'text-slate-400',
      bg: 'bg-slate-50',
      icon: '🚫',
    },
  ]

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-500 mt-0.5">숙박업 경매 매물 AI 분석 현황</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/map"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors"
          >
            🗺️ 지도 보기
          </Link>
          <Link
            href="/listings"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            📋 전체 목록
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, sub, color, bg, icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-slate-200`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <span className="text-lg">{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* 최근/고점수 매물 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">추천 매물</h2>
        <Link href="/listings" className="text-sm text-indigo-600 hover:underline">
          전체 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recent.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {recent.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-slate-400 text-sm">매물이 없습니다. 크론 또는 수집 API를 실행하세요.</p>
          <p className="text-xs text-slate-300 mt-1">POST /api/admin/collect</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 전체 테스트 실행**

```bash
npx jest --passWithNoTests --no-coverage
```

Expected: 기존 테스트 모두 통과 + 신규 테스트 통과

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: redesign dashboard with stats and listing grid"
```

---

## Self-Review

**Spec coverage:**
- ✅ 카카오맵 연동 (Task 5)
- ✅ 귀여운 매물 카드 디자인 (Task 3)
- ✅ 지도 위 커스텀 마커 (Task 5 — MarkerCard)
- ✅ 점수별 색상 코딩 (Task 3 ScoreBadge, Task 5 accent color)
- ✅ 리스트+맵 분할화면 (Task 5 MapView)
- ✅ BidMate 브랜딩 (Task 4)
- ✅ 매물 목록 그리드 뷰 (Task 6)
- ✅ 대시보드 리뉴얼 (Task 7)

**Type consistency 확인:**
- `MapListing` 타입이 Task 5에서 정의되고 page.tsx에서 사용 → `as any` cast로 Listing 호환
- `ScoreBadge`는 `score: number | null` props → Task 3과 5에서 동일하게 사용
- `PROPERTY_ICONS`는 `lib/labels.ts`에서 export → Task 2에서 정의, Task 3,5에서 import

**Placeholder 없음 확인:**
- 모든 Step에 완전한 코드 포함 ✅
