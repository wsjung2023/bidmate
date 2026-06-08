# Korean Real Estate Agent — Phase 1C: Frontend + Automation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1A and Phase 1B must be complete — database seeded, all agents implemented.

**Goal:** Complete the full user-facing frontend (listing detail with analysis trigger, report view, settings page with investment criteria), add Telegram notifications for high-score listings, and configure Vercel cron for daily automated pipeline runs.

**Architecture:** All pages are Next.js 15 Server Components where possible; client components only for interactive elements (analyze button, settings form). Telegram notifications call the Bot API via raw HTTPS. Vercel cron hits `/api/cron/daily` which triggers the pipeline on unanalyzed listings and sends Telegram alerts.

**Tech Stack:** Next.js 15 App Router, React Hook Form + Zod for settings form, Telegram Bot API (raw fetch, no package), Vercel cron (`vercel.json`), Prisma.

---

## File Map

| File | Purpose |
|------|---------|
| `app/(dashboard)/listings/[id]/page.tsx` | Full listing detail with metadata + analysis trigger button |
| `app/(dashboard)/listings/[id]/AnalyzeButton.tsx` | Client component — POST to analyze API, shows progress |
| `app/(dashboard)/reports/page.tsx` | Reports list with score/recommendation chips |
| `app/(dashboard)/reports/[id]/page.tsx` | Full markdown report view |
| `app/(dashboard)/settings/page.tsx` | Investment criteria form + Telegram setup |
| `app/(dashboard)/settings/SettingsForm.tsx` | Client component — React Hook Form for criteria |
| `app/api/settings/route.ts` | `GET/PUT /api/settings` — user's investment criteria |
| `app/api/reports/route.ts` | `GET /api/reports` — list completed reports |
| `app/api/reports/[id]/route.ts` | `GET /api/reports/:id` — single report detail |
| `app/api/cron/daily/route.ts` | `GET /api/cron/daily` — Vercel cron endpoint |
| `lib/notifications/telegram.ts` | Telegram Bot API wrapper |
| `vercel.json` | Cron schedule config |
| `__tests__/lib/notifications/telegram.test.ts` | Telegram client test |
| `__tests__/app/api/settings/route.test.ts` | Settings API test |
| `__tests__/app/api/reports/route.test.ts` | Reports API test |
| `__tests__/app/api/cron/daily/route.test.ts` | Cron endpoint test |

---

### Task 1: Listing Detail Page with Analysis Trigger

**Files:**
- Modify: `app/(dashboard)/listings/[id]/page.tsx`
- Create: `app/(dashboard)/listings/[id]/AnalyzeButton.tsx`

- [ ] **Step 1: Create AnalyzeButton client component**

Create `app/(dashboard)/listings/[id]/AnalyzeButton.tsx`:
```tsx
'use client'

import { useState } from 'react'

type Props = {
  listingId: string
  hasAnalysis: boolean
}

type AnalyzeState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'completed'; score: number; recommendation: string }
  | { status: 'dropped'; reason: string }
  | { status: 'error'; message: string }

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수',
  BUY: '매수',
  NEUTRAL: '중립',
  PASS: '보류',
  AVOID: '기피',
}

const RECOMMENDATION_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export function AnalyzeButton({ listingId, hasAnalysis }: Props) {
  const [state, setState] = useState<AnalyzeState>({ status: 'idle' })

  async function handleAnalyze() {
    setState({ status: 'running' })

    try {
      const res = await fetch(`/api/listings/${listingId}/analyze`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? '분석 실패' })
        return
      }

      if (data.status === 'DROPPED') {
        setState({ status: 'dropped', reason: data.droppedReason ?? '기준 미충족' })
      } else if (data.status === 'COMPLETED') {
        setState({ status: 'completed', score: data.score, recommendation: data.recommendation ?? 'NEUTRAL' })
        // Reload page to show report
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setState({ status: 'error', message: '분석 중 오류가 발생했습니다.' })
      }
    } catch {
      setState({ status: 'error', message: '네트워크 오류' })
    }
  }

  if (state.status === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-600 font-medium">분석 완료 — {state.score}점</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${RECOMMENDATION_COLOR[state.recommendation]}`}>
          {RECOMMENDATION_LABEL[state.recommendation] ?? state.recommendation}
        </span>
      </div>
    )
  }

  if (state.status === 'dropped') {
    return (
      <div className="text-red-500 text-sm">
        <span className="font-medium">분석 제외:</span> {state.reason}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-red-500 text-sm">{state.message}</span>
        <button
          onClick={handleAnalyze}
          className="text-sm text-blue-600 hover:underline"
        >
          재시도
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={state.status === 'running'}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        state.status === 'running'
          ? 'bg-blue-300 text-white cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {state.status === 'running' ? '분석 중... (1-2분 소요)' : hasAnalysis ? '재분석' : 'AI 분석 시작'}
    </button>
  )
}
```

- [ ] **Step 2: Replace listing detail page with full implementation**

Replace `app/(dashboard)/listings/[id]/page.tsx`:
```tsx
import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AnalyzeButton } from './AnalyzeButton'

const TYPE_LABEL: Record<string, string> = {
  AUCTION: '경매', PUBLIC_SALE: '공매', LODGING_LEASE: '숙박임차',
}
const PROPERTY_LABEL: Record<string, string> = {
  HOTEL: '호텔', PENSION: '펜션', GUESTHOUSE: '게스트하우스',
  MOTEL: '모텔', RESORT: '리조트', BUILDING: '건물', LAND: '토지', OTHER: '기타',
}
const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RISK_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '위험',
}
const RISK_COLOR: Record<string, string> = {
  LOW: 'text-green-600', MEDIUM: 'text-yellow-600', HIGH: 'text-orange-600', CRITICAL: 'text-red-600',
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { report: true },
      },
    },
  })

  if (!listing) notFound()

  const latestAnalysis = listing.analyses[0]
  const report = latestAnalysis?.report

  const discountRate = Math.round(
    ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/listings" className="hover:text-gray-600">매물 목록</Link>
        <span>›</span>
        <span className="text-gray-600">{listing.address}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
              {TYPE_LABEL[listing.listingType]}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {PROPERTY_LABEL[listing.propertyType]}
            </span>
            {listing.isDropped && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">분석 제외</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{listing.address}</h1>
          {listing.addressDetail && <p className="text-gray-500 mt-1">{listing.addressDetail}</p>}
        </div>

        {!listing.isDropped && (
          <AnalyzeButton listingId={listing.id} hasAnalysis={!!latestAnalysis} />
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">최저입찰가</p>
          <p className="text-xl font-bold text-gray-900">
            {(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">감정가</p>
          <p className="text-xl font-bold text-gray-500">
            {(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억
          </p>
          <p className="text-xs text-blue-600 mt-1">낙찰가율 {100 - discountRate}%</p>
        </div>
        {listing.area && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">면적</p>
            <p className="text-xl font-bold text-gray-900">{listing.area.toFixed(0)}m²</p>
            <p className="text-xs text-gray-400 mt-1">{(listing.area / 3.306).toFixed(0)}평</p>
          </div>
        )}
        {listing.score !== null && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">종합 점수</p>
            <p className={`text-xl font-bold ${listing.score >= 70 ? 'text-green-600' : listing.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
              {listing.score}점
            </p>
          </div>
        )}
      </div>

      {/* Property details */}
      <div className="bg-white rounded-xl border p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">물건 정보</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {listing.buildYear && (
            <>
              <dt className="text-gray-400">건축연도</dt>
              <dd className="font-medium">{listing.buildYear}년 ({new Date().getFullYear() - listing.buildYear}년 경과)</dd>
            </>
          )}
          {listing.floorInfo && (
            <>
              <dt className="text-gray-400">층수</dt>
              <dd className="font-medium">{listing.floorInfo}</dd>
            </>
          )}
          {listing.auctionDate && (
            <>
              <dt className="text-gray-400">경매 일정</dt>
              <dd className="font-medium">
                {listing.auctionDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                {listing.auctionCount > 0 && ` (${listing.auctionCount}회 유찰)`}
              </dd>
            </>
          )}
          {listing.court && (
            <>
              <dt className="text-gray-400">관할 법원</dt>
              <dd className="font-medium">{listing.court}</dd>
            </>
          )}
          {listing.caseNumber && (
            <>
              <dt className="text-gray-400">사건번호</dt>
              <dd className="font-mono text-sm">{listing.caseNumber}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Analysis results */}
      {latestAnalysis?.status === 'COMPLETED' && report && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">분석 결과</h2>
            <Link href={`/reports/${report.id}`} className="text-sm text-blue-600 hover:underline">
              전체 보고서 보기 →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {report.recommendation && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">투자 의견</p>
                <p className="font-bold text-gray-900">{RECOMMENDATION_LABEL[report.recommendation]}</p>
              </div>
            )}
            {report.expectedRoi && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">예상 ROI</p>
                <p className="font-bold text-green-600">{report.expectedRoi.toFixed(1)}%</p>
              </div>
            )}
            {report.riskLevel && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">위험도</p>
                <p className={`font-bold ${RISK_COLOR[report.riskLevel]}`}>{RISK_LABEL[report.riskLevel]}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">{report.summary.slice(0, 300)}{report.summary.length > 300 ? '...' : ''}</p>
        </div>
      )}

      {listing.isDropped && listing.droppedReason && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">분석 제외 사유</h2>
          <p className="text-sm text-red-600">{listing.droppedReason}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

1. Visit `/listings`
2. Click any listing → should see detail page with property info
3. Click "AI 분석 시작" → button shows "분석 중..." spinner
4. After completion (1-2 min) → shows score + recommendation + reloads
5. Report link appears below analysis results

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/listings/[id]/
git commit -m "feat: add listing detail page with AI analysis trigger"
```

---

### Task 2: Reports Pages

**Files:**
- Create: `app/api/reports/route.ts`
- Create: `app/api/reports/[id]/route.ts`
- Replace: `app/(dashboard)/reports/page.tsx`
- Create: `app/(dashboard)/reports/[id]/page.tsx`
- Create: `__tests__/app/api/reports/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/reports/route.test.ts`:
```typescript
import { GET } from '@/app/api/reports/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    report: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'report-1',
          title: '[78점] 강원도 평창군 투자 분석',
          summary: '우수한 투자 매물',
          recommendation: 'BUY',
          expectedRoi: 14.1,
          riskLevel: 'LOW',
          createdAt: new Date(),
          analysis: { listing: { id: 'listing-1', address: '강원도 평창군' } },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
  },
}))

describe('GET /api/reports', () => {
  it('returns reports with total', async () => {
    const req = new NextRequest('http://localhost/api/reports')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.reports).toHaveLength(1)
    expect(body.total).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="app/api/reports/route"
```

Expected: FAIL

- [ ] **Step 3: Create reports list API**

Create `app/api/reports/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        analysis: {
          include: {
            listing: {
              select: { id: true, address: true, propertyType: true, listingType: true },
            },
          },
        },
      },
    }),
    prisma.report.count(),
  ])

  return NextResponse.json({ reports, total, page })
}
```

Create `app/api/reports/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: {
      analysis: {
        include: {
          listing: true,
        },
      },
    },
  })

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(report)
}
```

- [ ] **Step 4: Create reports list page**

Replace `app/(dashboard)/reports/page.tsx`:
```tsx
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RECOMMENDATION_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        analysis: {
          include: {
            listing: { select: { id: true, address: true, propertyType: true } },
          },
        },
      },
    }),
    prisma.report.count(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        분석 보고서 <span className="text-gray-400 text-xl font-normal">({total}건)</span>
      </h1>

      <div className="bg-white rounded-xl border divide-y">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-gray-900 mb-1">{report.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{report.summary.slice(0, 120)}</p>
              <p className="text-xs text-gray-300 mt-2">
                {report.createdAt.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {report.recommendation && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${RECOMMENDATION_COLOR[report.recommendation]}`}>
                  {RECOMMENDATION_LABEL[report.recommendation]}
                </span>
              )}
              {report.expectedRoi && (
                <span className="text-xs text-green-600 font-medium">ROI {report.expectedRoi.toFixed(1)}%</span>
              )}
            </div>
          </Link>
        ))}

        {reports.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-3">아직 분석된 매물이 없습니다.</p>
            <Link href="/listings" className="text-blue-600 text-sm hover:underline">
              매물 목록에서 AI 분석을 시작하세요 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create report detail page (markdown renderer)**

Create `app/(dashboard)/reports/[id]/page.tsx`:
```tsx
import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const RISK_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '위험',
}
const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const RECO_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RECO_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      analysis: {
        include: { listing: true },
      },
    },
  })

  if (!report) notFound()

  const listing = report.analysis.listing

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/reports" className="hover:text-gray-600">보고서 목록</Link>
        <span>›</span>
        <span className="text-gray-600 truncate">{listing.address}</span>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{report.title}</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          {report.recommendation && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${RECO_COLOR[report.recommendation]}`}>
              {RECO_LABEL[report.recommendation]}
            </span>
          )}
          {report.riskLevel && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${RISK_COLOR[report.riskLevel]}`}>
              위험도: {RISK_LABEL[report.riskLevel]}
            </span>
          )}
          {report.expectedRoi && (
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
              예상 ROI: {report.expectedRoi.toFixed(1)}%
            </span>
          )}
          {report.recommendedBid && (
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              권장 입찰가: {(Number(report.recommendedBid) / 100_000_000).toFixed(1)}억
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 mb-6 leading-relaxed">
          {report.summary}
        </p>

        {/* Render full report as formatted text */}
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
            {report.fullReport}
          </pre>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/listings/${listing.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 매물 상세로 돌아가기
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- --testPathPattern="app/api/reports"
```

Expected: PASS

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

1. Run at least one analysis (visit `/listings`, click a listing, click "AI 분석 시작")
2. Visit `/reports` — completed report appears in list
3. Click report → full report rendered

- [ ] **Step 8: Commit**

```bash
git add app/(dashboard)/reports/ app/api/reports/ __tests__/app/api/reports/
git commit -m "feat: add reports list and detail pages with full markdown report view"
```

---

### Task 3: Settings Page (Investment Criteria)

**Files:**
- Create: `app/api/settings/route.ts`
- Replace: `app/(dashboard)/settings/page.tsx`
- Create: `app/(dashboard)/settings/SettingsForm.tsx`
- Create: `__tests__/app/api/settings/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/settings/route.test.ts`:
```typescript
import { GET, PUT } from '@/app/api/settings/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    investmentCriteria: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({
        id: 'crit-1',
        userId: 'user-1',
        minScore: 65,
        regions: ['강원도', '제주도'],
        propertyTypes: ['PENSION', 'GUESTHOUSE'],
        listingTypes: ['AUCTION'],
        telegramChatId: null,
        notifyEnabled: false,
      }),
    },
  },
}))

describe('GET /api/settings', () => {
  it('returns null criteria when none exist', async () => {
    const req = new NextRequest('http://localhost/api/settings')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.criteria).toBeNull()
  })
})

describe('PUT /api/settings', () => {
  it('saves criteria and returns result', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ minScore: 65, regions: ['강원도', '제주도'], propertyTypes: ['PENSION'], listingTypes: ['AUCTION'] }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.criteria.minScore).toBe(65)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="app/api/settings"
```

Expected: FAIL

- [ ] **Step 3: Create settings API**

Create `app/api/settings/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const CriteriaSchema = z.object({
  regions: z.array(z.string()).default([]),
  minBid: z.number().optional(),
  maxBid: z.number().optional(),
  minArea: z.number().optional(),
  maxArea: z.number().optional(),
  propertyTypes: z.array(z.string()).default([]),
  listingTypes: z.array(z.string()).default([]),
  minRoi: z.number().optional(),
  minScore: z.number().min(0).max(100).default(60),
  telegramChatId: z.string().optional(),
  notifyEnabled: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const criteria = await prisma.investmentCriteria.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ criteria })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CriteriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const criteria = await prisma.investmentCriteria.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
      minBid: parsed.data.minBid ? BigInt(parsed.data.minBid) : null,
      maxBid: parsed.data.maxBid ? BigInt(parsed.data.maxBid) : null,
      propertyTypes: parsed.data.propertyTypes as any,
      listingTypes: parsed.data.listingTypes as any,
    },
    update: {
      ...parsed.data,
      minBid: parsed.data.minBid ? BigInt(parsed.data.minBid) : null,
      maxBid: parsed.data.maxBid ? BigInt(parsed.data.maxBid) : null,
      propertyTypes: parsed.data.propertyTypes as any,
      listingTypes: parsed.data.listingTypes as any,
    },
  })

  return NextResponse.json({ criteria })
}
```

- [ ] **Step 4: Create settings form client component**

Create `app/(dashboard)/settings/SettingsForm.tsx`:
```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const FormSchema = z.object({
  minScore: z.coerce.number().min(0).max(100),
  regions: z.string(),
  telegramChatId: z.string().optional(),
  notifyEnabled: z.boolean(),
})

type FormValues = z.infer<typeof FormSchema>

type Criteria = {
  minScore: number
  regions: string[]
  telegramChatId?: string | null
  notifyEnabled: boolean
} | null

export function SettingsForm({ initialCriteria }: { initialCriteria: Criteria }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      minScore: initialCriteria?.minScore ?? 60,
      regions: initialCriteria?.regions.join(', ') ?? '',
      telegramChatId: initialCriteria?.telegramChatId ?? '',
      notifyEnabled: initialCriteria?.notifyEnabled ?? false,
    },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    setSaved(false)

    const regions = data.regions
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        minScore: data.minScore,
        regions,
        telegramChatId: data.telegramChatId || undefined,
        notifyEnabled: data.notifyEnabled,
        propertyTypes: [],
        listingTypes: [],
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? '저장 실패')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          최소 점수 기준 (0-100)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          {...register('minScore')}
          className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">이 점수 미만의 매물은 Telegram 알림에서 제외</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          관심 지역 (쉼표로 구분)
        </label>
        <input
          type="text"
          placeholder="강원도, 제주도, 경상북도"
          {...register('regions')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Telegram 알림 설정</h3>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">설정 방법:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Telegram에서 <code className="bg-blue-100 px-1 rounded">@BotFather</code>로 봇을 만들고 토큰을 .env에 저장</li>
            <li>봇과 대화를 시작하고 <code className="bg-blue-100 px-1 rounded">@userinfobot</code>으로 Chat ID 확인</li>
            <li>아래에 Chat ID 입력 후 저장</li>
          </ol>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telegram Chat ID
          </label>
          <input
            type="text"
            placeholder="예: 123456789"
            {...register('telegramChatId')}
            className="w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('notifyEnabled')} className="rounded" />
          <span className="text-sm text-gray-700">새 고점수 매물 발견 시 Telegram 알림 받기</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? '저장 중...' : '설정 저장'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ 저장되었습니다</span>}
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Replace settings page**

Replace `app/(dashboard)/settings/page.tsx`:
```tsx
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const session = await auth()
  const criteria = session
    ? await prisma.investmentCriteria.findUnique({ where: { userId: session.user.id } })
    : null

  const serializable = criteria
    ? {
        minScore: criteria.minScore,
        regions: criteria.regions,
        telegramChatId: criteria.telegramChatId ?? null,
        notifyEnabled: criteria.notifyEnabled,
      }
    : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">투자 기준 및 알림 설정</h2>
        <SettingsForm initialCriteria={serializable} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- --testPathPattern="app/api/settings"
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/settings/ app/api/settings/ __tests__/app/api/settings/
git commit -m "feat: add settings page with investment criteria and Telegram configuration"
```

---

### Task 4: Telegram Notifications

**Files:**
- Create: `lib/notifications/telegram.ts`
- Create: `__tests__/lib/notifications/telegram.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/notifications/telegram.test.ts`:
```typescript
import { sendTelegramMessage, formatListingAlert } from '@/lib/notifications/telegram'

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ ok: true, result: { message_id: 1 } }),
}) as jest.Mock

describe('sendTelegramMessage', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    jest.clearAllMocks()
  })

  it('sends message via Telegram Bot API', async () => {
    await sendTelegramMessage('123456789', 'Hello from test')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"chat_id":"123456789"'),
      })
    )
  })

  it('does not throw when token is missing', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    await expect(sendTelegramMessage('123', 'test')).resolves.not.toThrow()
  })
})

describe('formatListingAlert', () => {
  it('formats a listing alert message', () => {
    const msg = formatListingAlert({
      address: '강원도 평창군',
      listingType: 'AUCTION',
      propertyType: 'PENSION',
      minimumBid: 595_000_000,
      score: 78,
      recommendation: 'BUY',
      reportUrl: 'http://localhost/reports/r-1',
    })
    expect(msg).toContain('강원도 평창군')
    expect(msg).toContain('78점')
    expect(msg).toContain('매수')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="lib/notifications/telegram"
```

Expected: FAIL

- [ ] **Step 3: Create Telegram client**

Create `lib/notifications/telegram.ts`:
```typescript
const RECO_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수 🟢🟢',
  BUY: '매수 🟢',
  NEUTRAL: '중립 🟡',
  PASS: '보류 ⚪',
  AVOID: '기피 🔴',
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — skipping notification')
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      console.error('Telegram API error:', body)
    }
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}

type AlertData = {
  address: string
  listingType: string
  propertyType: string
  minimumBid: number
  score: number
  recommendation: string
  reportUrl: string
}

export function formatListingAlert(data: AlertData): string {
  const bidBillion = (data.minimumBid / 100_000_000).toFixed(1)
  const typeLabel = { AUCTION: '경매', PUBLIC_SALE: '공매', LODGING_LEASE: '숙박임차' }[data.listingType] ?? data.listingType
  const recoLabel = RECO_LABEL[data.recommendation] ?? data.recommendation

  return [
    `🏠 *새 투자 매물 발견*`,
    ``,
    `📍 ${data.address}`,
    `🏷️ ${typeLabel} | ${data.propertyType}`,
    `💰 최저입찰가: *${bidBillion}억원*`,
    `⭐ 종합 점수: *${data.score}점*`,
    `📊 투자 의견: ${recoLabel}`,
    ``,
    `[보고서 보기](${data.reportUrl})`,
  ].join('\n')
}

export async function notifyHighScoreListings(
  listings: AlertData[],
  chatId: string,
  minScore: number = 70,
): Promise<void> {
  const highScore = listings.filter((l) => l.score >= minScore)
  for (const listing of highScore) {
    const msg = formatListingAlert(listing)
    await sendTelegramMessage(chatId, msg)
    // Rate limit: 1 message per second
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="lib/notifications/telegram"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/notifications/ __tests__/lib/notifications/
git commit -m "feat: add Telegram notification client with listing alert formatter"
```

---

### Task 5: Daily Cron Automation

**Files:**
- Create: `app/api/cron/daily/route.ts`
- Create: `vercel.json`
- Create: `__tests__/app/api/cron/daily/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/cron/daily/route.test.ts`:
```typescript
import { GET } from '@/app/api/cron/daily/route'
import { NextRequest } from 'next/server'

process.env.CRON_SECRET = 'test-secret'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    pipelineRun: {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    investmentCriteria: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

describe('GET /api/cron/daily', () => {
  it('returns 401 without correct secret', async () => {
    const req = new NextRequest('http://localhost/api/cron/daily', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct secret', async () => {
    const req = new NextRequest('http://localhost/api/cron/daily', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="api/cron/daily"
```

Expected: FAIL

- [ ] **Step 3: Create cron endpoint**

Create `app/api/cron/daily/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { runPipeline } from '@/lib/pipeline/orchestrator'
import { sendTelegramMessage, formatListingAlert } from '@/lib/notifications/telegram'

export async function GET(req: NextRequest) {
  // Vercel cron sends the CRON_SECRET as a Bearer token
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const run = await prisma.pipelineRun.create({ data: { status: 'RUNNING' } })

  // Find unanalyzed listings
  const listings = await prisma.listing.findMany({
    where: { isDropped: false, score: null },
    orderBy: { collectedAt: 'desc' },
    take: 50,
  })

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: { totalItems: listings.length },
  })

  let processed = 0
  let failed = 0
  let dropped = 0
  const highScoreResults: Array<{
    address: string
    listingType: string
    propertyType: string
    minimumBid: number
    score: number
    recommendation: string
    reportUrl: string
  }> = []

  for (const listing of listings) {
    const result = await runPipeline(listing)

    if (result.status === 'FAILED') {
      failed++
    } else if (result.status === 'DROPPED') {
      dropped++
    } else {
      processed++
      if (result.score !== undefined && result.score >= 70 && result.reportId) {
        highScoreResults.push({
          address: listing.address,
          listingType: listing.listingType,
          propertyType: listing.propertyType,
          minimumBid: Number(listing.minimumBid),
          score: result.score,
          recommendation: result.recommendation ?? 'NEUTRAL',
          reportUrl: `${process.env.NEXTAUTH_URL}/reports/${result.reportId}`,
        })
      }
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { processed, failed, dropped },
    })
  }

  // Send Telegram notifications to all users who have enabled alerts
  if (highScoreResults.length > 0) {
    const usersWithNotifications = await prisma.investmentCriteria.findMany({
      where: { notifyEnabled: true, telegramChatId: { not: null } },
    })

    for (const userCriteria of usersWithNotifications) {
      if (!userCriteria.telegramChatId) continue
      const minScore = userCriteria.minScore

      for (const result of highScoreResults.filter((r) => r.score >= minScore)) {
        const msg = formatListingAlert(result)
        await sendTelegramMessage(userCriteria.telegramChatId, msg)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: failed === listings.length && listings.length > 0 ? 'FAILED' : 'COMPLETED',
      completedAt: new Date(),
    },
  })

  return NextResponse.json({
    runId: run.id,
    totalItems: listings.length,
    processed,
    failed,
    dropped,
    highScoreAlerts: highScoreResults.length,
  })
}
```

- [ ] **Step 4: Add CRON_SECRET to .env.example**

Open `.env.example`. Append:
```bash
# ─── Cron Job Security ───────────────────────────────────────────────────────
# Vercel automatically provides this when using Vercel Cron Jobs
# For local testing: set to any random string
CRON_SECRET="your-cron-secret"
```

Also add to `.env.local`:
```bash
CRON_SECRET="local-dev-secret"
```

- [ ] **Step 5: Create vercel.json with cron schedule**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs at 02:00 UTC (11:00 KST) every day.

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- --testPathPattern="api/cron/daily"
```

Expected: PASS

- [ ] **Step 7: Run full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add app/api/cron/ lib/notifications/ __tests__/app/api/cron/ vercel.json .env.example
git commit -m "feat: add daily cron automation with Telegram notifications"
```

---

### Task 6: End-to-End Smoke Test

**Files:**
- Create: `__tests__/e2e/pipeline-smoke.test.ts`

- [ ] **Step 1: Write smoke test**

Create `__tests__/e2e/pipeline-smoke.test.ts`:
```typescript
import { mockListings } from '@/prisma/mock-data'
import { calculateScore } from '@/lib/scoring/engine'
import { checkDropRules } from '@/lib/scoring/drop-rules'

// Verifies the full data flow compiles and types are consistent
// Does NOT hit LLM or database — only tests the deterministic parts

describe('Pipeline smoke test (deterministic only)', () => {
  it('all 20 mock listings have valid price relationships', () => {
    for (const listing of mockListings) {
      expect(Number(listing.minimumBid)).toBeLessThanOrEqual(Number(listing.appraisalValue))
      expect(Number(listing.minimumBid)).toBeGreaterThan(0)
      expect(Number(listing.appraisalValue)).toBeGreaterThan(0)
    }
  })

  it('scoring engine produces valid scores for representative inputs', () => {
    const testOutputs = {
      rightsAnalysis: { hasLien: false, hasInjunction: false, hasLegalSurfaceRight: false, hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false, clearanceEstimate: 0, summary: '' },
      licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '' },
      commercialArea: { touristProximityScore: 75, competitorCount: 3, occupancyRateBenchmark: 70, averageDailyRate: 110000, summary: '' },
      financials: { estimatedMonthlyRevenue: 9000000, estimatedMonthlyCost: 4500000, estimatedMonthlyProfit: 4500000, roiPercent: 10.8, breakEvenMonths: 93, summary: '' },
      riskFactors: { level: 'LOW' as const, factors: [], summary: '' },
    }

    const score = calculateScore(testOutputs)
    expect(score.total).toBeGreaterThan(0)
    expect(score.total).toBeLessThanOrEqual(100)

    const drop = checkDropRules(testOutputs, 595_000_000, 850_000_000)
    expect(drop.drop).toBe(false)
  })

  it('drop rules trigger correctly for ineligible listing', () => {
    const outputs = {
      rightsAnalysis: { hasLien: false, hasInjunction: false, hasLegalSurfaceRight: true, hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false, clearanceEstimate: 0, summary: '' },
      licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '' },
      commercialArea: { touristProximityScore: 70, competitorCount: 5, occupancyRateBenchmark: 65, averageDailyRate: 90000, summary: '' },
      financials: { estimatedMonthlyRevenue: 7000000, estimatedMonthlyCost: 3500000, estimatedMonthlyProfit: 3500000, roiPercent: 8.4, breakEvenMonths: 100, summary: '' },
      riskFactors: { level: 'MEDIUM' as const, factors: [], summary: '' },
    }
    const drop = checkDropRules(outputs, 595_000_000, 850_000_000)
    expect(drop.drop).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- --testPathPattern="e2e/pipeline-smoke"
```

Expected: PASS

- [ ] **Step 3: Run full test suite one final time**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 4: Final commit**

```bash
git add __tests__/e2e/
git commit -m "test: add end-to-end pipeline smoke test"
```

---

## Phase 1C Complete ✅

At this checkpoint — **Phase 1 is 100% complete:**

| Feature | Status |
|---------|--------|
| Listing detail page with analysis trigger button | ✅ |
| Analysis result (score + recommendation) shown inline | ✅ |
| Reports list and detail pages | ✅ |
| Full markdown report rendered | ✅ |
| Settings page (investment criteria + Telegram chat ID) | ✅ |
| Telegram notification client | ✅ |
| High-score listing Telegram alerts | ✅ |
| Daily cron at 02:00 UTC | ✅ |
| All tests passing | ✅ |

## Deployment Checklist

Before deploying to Vercel:

- [ ] Push repo to GitHub
- [ ] Connect GitHub repo in Vercel dashboard
- [ ] Add all `.env.example` variables to Vercel Environment Variables
- [ ] In Vercel: AI > Gateway — configure Anthropic as a provider
- [ ] In Supabase: enable PostGIS extension (`CREATE EXTENSION postgis;`)
- [ ] Run `npx prisma migrate deploy` (or `db push`) against production DB
- [ ] Run `npx prisma db seed` to seed production data
- [ ] Verify cron is recognized in Vercel dashboard (Project > Cron Jobs)
- [ ] Set `CRON_SECRET` to match what Vercel Cron sends automatically
- [ ] Test Telegram notification by manually calling `/api/cron/daily` with the secret

## Phase 2 Notes

Phase 2 will replace mock data with real API adapters:
- 온비드 (OnBid) — public sale listings API (legal, no auth bypass)
- 법원 경매 정보 — 법원 경매정보 사이트 open API
- 건축물대장 — 공공데이터포털 API
- 소상공인 상권정보 — 소상공인시장진흥공단 공공 API

All Phase 2 collectors swap in to `lib/agents/collector.ts` without touching the rest of the pipeline.
