# Korean Real Estate Agent — Phase 1B: Agent Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1A must be complete — Prisma schema, seeded database, and working auth are required.

**Goal:** Implement the 6-agent analysis pipeline (Collector → Normalizer → Due Diligence → Risk → Strategy → Report) with a 100-point scoring model, auto-drop rules, and an API endpoint to trigger and monitor pipeline runs.

**Architecture:** Each agent is a pure function `(input: T) => Promise<Output>`. The LLM client wraps `@ai-sdk/anthropic` with a tier-based model router (`fast/standard/premium`). The pipeline orchestrator calls agents in sequence, persists intermediate results to the `Analysis` row, and writes the final `Report`. A `/api/pipeline/trigger` POST endpoint starts a run; `/api/pipeline/status/[runId]` polls progress.

**Tech Stack:** Vercel AI SDK v4 (`ai` + `@ai-sdk/anthropic`), Zod for structured LLM outputs, Prisma for pipeline state, Jest for unit tests.

**Security note (per planning doc):** No scraping, no CAPTCHA bypass. All collectors use mock data in Phase 1. Real API adapters (온비드, 건축물대장) wired in Phase 2.

---

## File Map

| File | Purpose |
|------|---------|
| `lib/llm/client.ts` | LLM wrapper — tier-based model routing, `generateText` + `generateObject` |
| `lib/scoring/types.ts` | `ScoreBreakdown` type + score category constants |
| `lib/scoring/engine.ts` | 100-point scoring function given agent outputs |
| `lib/scoring/drop-rules.ts` | Auto-drop rules — returns `{ drop: boolean, reason: string }` |
| `lib/agents/types.ts` | Input/output types for all 6 agents |
| `lib/agents/collector.ts` | Collector — returns mock listings from DB by source |
| `lib/agents/normalizer.ts` | Normalizer — LLM extracts structured fields from raw listing |
| `lib/agents/due-diligence.ts` | Due Diligence — rights analysis + lodging license feasibility |
| `lib/agents/risk.ts` | Risk agent — identifies risk factors, assigns risk level |
| `lib/agents/strategy.ts` | Strategy agent — recommended bid, P&L breakeven, ops plan |
| `lib/agents/report.ts` | Report agent — synthesizes all outputs into Korean report |
| `lib/pipeline/orchestrator.ts` | Runs agents in sequence, writes Analysis + Report to DB |
| `app/api/pipeline/trigger/route.ts` | `POST` — starts a pipeline run for a listing |
| `app/api/pipeline/status/[runId]/route.ts` | `GET` — returns PipelineRun status |
| `app/api/listings/[id]/analyze/route.ts` | `POST` — trigger analysis for a single listing |
| `__tests__/lib/scoring/engine.test.ts` | Scoring engine unit tests |
| `__tests__/lib/scoring/drop-rules.test.ts` | Drop rules unit tests |
| `__tests__/lib/agents/collector.test.ts` | Collector agent test |
| `__tests__/lib/agents/normalizer.test.ts` | Normalizer agent test (mocked LLM) |
| `__tests__/lib/pipeline/orchestrator.test.ts` | Orchestrator integration test (mocked agents) |

---

### Task 1: LLM Client

**Files:**
- Create: `lib/llm/client.ts`
- Create: `__tests__/lib/llm/client.test.ts`

- [ ] **Step 1: Install AI SDK**

```bash
npm install ai @ai-sdk/anthropic
```

- [ ] **Step 2: Write failing test**

Create `__tests__/lib/llm/client.test.ts`:
```typescript
import { callLLM, callLLMStructured } from '@/lib/llm/client'

jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'mock response' }),
  generateObject: jest.fn().mockResolvedValue({ object: { result: 'ok' } }),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn().mockReturnValue('mock-model'),
}))

describe('LLM client', () => {
  it('callLLM returns text', async () => {
    const result = await callLLM('test prompt')
    expect(result).toBe('mock response')
  })

  it('callLLMStructured returns typed object', async () => {
    const { z } = await import('zod')
    const schema = z.object({ result: z.string() })
    const result = await callLLMStructured('test prompt', schema)
    expect(result).toEqual({ result: 'ok' })
  })

  it('supports fast/standard/premium tiers', async () => {
    const { generateText } = jest.requireMock('ai')
    await callLLM('p1', 'fast')
    await callLLM('p2', 'standard')
    await callLLM('p3', 'premium')
    expect(generateText).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --testPathPattern="lib/llm/client"
```

Expected: FAIL

- [ ] **Step 4: Create LLM client**

Create `lib/llm/client.ts`:
```typescript
import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { z } from 'zod'

export type LLMTier = 'fast' | 'standard' | 'premium'

// fast    → claude-haiku-4-5     ($1/$5 per 1M)   — classification, filtering
// standard → claude-sonnet-4-6   ($3/$15 per 1M)  — main analysis (default)
// premium  → claude-opus-4-8     ($5/$25 per 1M)  — final report, complex reasoning
const MODEL_IDS: Record<LLMTier, string> = {
  fast: 'claude-haiku-4-5',
  standard: 'claude-sonnet-4-6',
  premium: 'claude-opus-4-8',
}

function getModel(tier: LLMTier) {
  // On Vercel production: configure via Vercel AI Gateway dashboard
  // and set ANTHROPIC_API_KEY. The @ai-sdk/anthropic package reads it automatically.
  return anthropic(MODEL_IDS[tier])
}

export async function callLLM(
  prompt: string,
  tier: LLMTier = 'standard',
  systemPrompt?: string,
): Promise<string> {
  const { text } = await generateText({
    model: getModel(tier),
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
    maxTokens: 4096,
  })
  return text
}

export async function callLLMStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  tier: LLMTier = 'standard',
  systemPrompt?: string,
): Promise<T> {
  const { object } = await generateObject({
    model: getModel(tier),
    schema,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
  })
  return object
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --testPathPattern="lib/llm/client"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/llm/ __tests__/lib/llm/
git commit -m "feat: add LLM client with tier-based model routing"
```

---

### Task 2: Scoring Engine + Auto-Drop Rules

**Files:**
- Create: `lib/scoring/types.ts`
- Create: `lib/scoring/engine.ts`
- Create: `lib/scoring/drop-rules.ts`
- Create: `__tests__/lib/scoring/engine.test.ts`
- Create: `__tests__/lib/scoring/drop-rules.test.ts`

- [ ] **Step 1: Write failing test for scoring engine**

Create `__tests__/lib/scoring/engine.test.ts`:
```typescript
import { calculateScore } from '@/lib/scoring/engine'
import type { AgentOutputs } from '@/lib/agents/types'

const baseOutputs: AgentOutputs = {
  rightsAnalysis: {
    hasLien: false,
    hasInjunction: false,
    hasLegalSurfaceRight: false,
    hasOccupancy: false,
    hasUnpaidRent: false,
    hasTaxLien: false,
    clearanceEstimate: 0,
    summary: '권리관계 이상 없음',
  },
  licenseCheck: {
    eligible: true,
    propertyUseChangeable: true,
    estimatedFee: 500000,
    obstacles: [],
    summary: '숙박업 등록 가능',
  },
  commercialArea: {
    touristProximityScore: 80,
    competitorCount: 3,
    occupancyRateBenchmark: 72,
    averageDailyRate: 120000,
    summary: '관광지 인접, 경쟁 적당',
  },
  financials: {
    estimatedMonthlyRevenue: 12_000_000,
    estimatedMonthlyCost: 5_000_000,
    estimatedMonthlyProfit: 7_000_000,
    roiPercent: 14.1,
    breakEvenMonths: 84,
    summary: '수익성 양호',
  },
  riskFactors: {
    level: 'LOW',
    factors: [],
    summary: '특이사항 없음',
  },
}

describe('calculateScore', () => {
  it('returns a number between 0 and 100', () => {
    const result = calculateScore(baseOutputs)
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('high-quality listing scores above 70', () => {
    const result = calculateScore(baseOutputs)
    expect(result.total).toBeGreaterThanOrEqual(70)
  })

  it('listing with lien scores lower than without', () => {
    const withLien: AgentOutputs = {
      ...baseOutputs,
      rightsAnalysis: { ...baseOutputs.rightsAnalysis, hasLien: true, clearanceEstimate: 50_000_000 },
    }
    const withoutLien = calculateScore(baseOutputs)
    const withLienScore = calculateScore(withLien)
    expect(withLienScore.total).toBeLessThan(withoutLien.total)
  })

  it('breakdown sums to total', () => {
    const result = calculateScore(baseOutputs)
    const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0)
    expect(Math.round(sum)).toBe(result.total)
  })
})
```

- [ ] **Step 2: Write failing test for drop rules**

Create `__tests__/lib/scoring/drop-rules.test.ts`:
```typescript
import { checkDropRules } from '@/lib/scoring/drop-rules'
import type { AgentOutputs } from '@/lib/agents/types'

const safeOutputs: AgentOutputs = {
  rightsAnalysis: {
    hasLien: false,
    hasInjunction: false,
    hasLegalSurfaceRight: false,
    hasOccupancy: false,
    hasUnpaidRent: false,
    hasTaxLien: false,
    clearanceEstimate: 0,
    summary: '',
  },
  licenseCheck: {
    eligible: true,
    propertyUseChangeable: true,
    estimatedFee: 0,
    obstacles: [],
    summary: '',
  },
  commercialArea: {
    touristProximityScore: 60,
    competitorCount: 5,
    occupancyRateBenchmark: 65,
    averageDailyRate: 100000,
    summary: '',
  },
  financials: {
    estimatedMonthlyRevenue: 8_000_000,
    estimatedMonthlyCost: 4_000_000,
    estimatedMonthlyProfit: 4_000_000,
    roiPercent: 8.0,
    breakEvenMonths: 120,
    summary: '',
  },
  riskFactors: { level: 'LOW', factors: [], summary: '' },
}

describe('checkDropRules', () => {
  it('safe listing is not dropped', () => {
    const result = checkDropRules(safeOutputs, 700_000_000, 850_000_000)
    expect(result.drop).toBe(false)
  })

  it('drops listing with legal surface right', () => {
    const outputs = {
      ...safeOutputs,
      rightsAnalysis: { ...safeOutputs.rightsAnalysis, hasLegalSurfaceRight: true },
    }
    const result = checkDropRules(outputs, 700_000_000, 850_000_000)
    expect(result.drop).toBe(true)
    expect(result.reason).toContain('법정지상권')
  })

  it('drops listing with injunction', () => {
    const outputs = {
      ...safeOutputs,
      rightsAnalysis: { ...safeOutputs.rightsAnalysis, hasInjunction: true },
    }
    const result = checkDropRules(outputs, 700_000_000, 850_000_000)
    expect(result.drop).toBe(true)
    expect(result.reason).toContain('가처분')
  })

  it('drops listing where license is not eligible', () => {
    const outputs = {
      ...safeOutputs,
      licenseCheck: { ...safeOutputs.licenseCheck, eligible: false },
    }
    const result = checkDropRules(outputs, 700_000_000, 850_000_000)
    expect(result.drop).toBe(true)
  })

  it('drops listing with ROI under 5%', () => {
    const outputs = {
      ...safeOutputs,
      financials: { ...safeOutputs.financials, roiPercent: 4.0 },
    }
    const result = checkDropRules(outputs, 700_000_000, 850_000_000)
    expect(result.drop).toBe(true)
    expect(result.reason).toContain('ROI')
  })

  it('drops listing bid > 120% of appraisal', () => {
    const result = checkDropRules(safeOutputs, 1_100_000_000, 850_000_000)
    expect(result.drop).toBe(true)
    expect(result.reason).toContain('입찰가')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="lib/scoring"
```

Expected: FAIL

- [ ] **Step 4: Create agent output types**

Create `lib/agents/types.ts`:
```typescript
export type RightsAnalysis = {
  hasLien: boolean
  hasInjunction: boolean
  hasLegalSurfaceRight: boolean
  hasOccupancy: boolean
  hasUnpaidRent: boolean
  hasTaxLien: boolean
  clearanceEstimate: number
  summary: string
}

export type LicenseCheck = {
  eligible: boolean
  propertyUseChangeable: boolean
  estimatedFee: number
  obstacles: string[]
  summary: string
}

export type CommercialArea = {
  touristProximityScore: number  // 0-100
  competitorCount: number
  occupancyRateBenchmark: number  // % (e.g. 72 = 72%)
  averageDailyRate: number  // KRW
  summary: string
}

export type Financials = {
  estimatedMonthlyRevenue: number  // KRW
  estimatedMonthlyCost: number     // KRW
  estimatedMonthlyProfit: number   // KRW
  roiPercent: number               // annual ROI %
  breakEvenMonths: number
  summary: string
}

export type RiskFactors = {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  factors: string[]
  summary: string
}

export type Strategy = {
  recommendedBid: number  // KRW
  operatingModel: string
  keyActions: string[]
  summary: string
}

export type AgentOutputs = {
  rightsAnalysis: RightsAnalysis
  licenseCheck: LicenseCheck
  commercialArea: CommercialArea
  financials: Financials
  riskFactors: RiskFactors
  strategy?: Strategy
}
```

- [ ] **Step 5: Create scoring types**

Create `lib/scoring/types.ts`:
```typescript
export type ScoreBreakdown = {
  rights: number    // max 30 — 권리분석
  commercial: number // max 25 — 입지/상권
  financials: number // max 25 — 수익성
  license: number    // max 10 — 인허가
  condition: number  // max 10 — 건물상태
}

export type ScoreResult = {
  total: number
  breakdown: ScoreBreakdown
}
```

- [ ] **Step 6: Create scoring engine**

Create `lib/scoring/engine.ts`:
```typescript
import type { AgentOutputs } from '@/lib/agents/types'
import type { ScoreResult } from './types'

export function calculateScore(outputs: AgentOutputs): ScoreResult {
  const rights = scoreRights(outputs.rightsAnalysis)
  const commercial = scoreCommercial(outputs.commercialArea)
  const financials = scoreFinancials(outputs.financials)
  const license = scoreLicense(outputs.licenseCheck)
  const condition = 7 // default — building condition not yet assessed in Phase 1

  const total = Math.round(rights + commercial + financials + license + condition)

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: { rights, commercial, financials, license, condition },
  }
}

function scoreRights(r: AgentOutputs['rightsAnalysis']): number {
  let score = 30
  if (r.hasLegalSurfaceRight) score -= 25
  if (r.hasInjunction) score -= 20
  if (r.hasLien) score -= Math.min(15, 5 + (r.clearanceEstimate / 100_000_000) * 3)
  if (r.hasOccupancy) score -= 10
  if (r.hasUnpaidRent) score -= 8
  if (r.hasTaxLien) score -= 5
  return Math.max(0, score)
}

function scoreCommercial(c: AgentOutputs['commercialArea']): number {
  // touristProximityScore 0-100 maps to 0-12 points
  const proximity = (c.touristProximityScore / 100) * 12
  // occupancy benchmark: 80%+ = 8pts, 60-80% = 5pts, <60% = 2pts
  const occupancy = c.occupancyRateBenchmark >= 80 ? 8 : c.occupancyRateBenchmark >= 60 ? 5 : 2
  // competitor penalty: 0-2 = 0, 3-5 = -1, 6-10 = -2, 11+ = -5
  const competitorPenalty =
    c.competitorCount <= 2 ? 0 : c.competitorCount <= 5 ? 1 : c.competitorCount <= 10 ? 2 : 5

  return Math.max(0, Math.min(25, proximity + occupancy - competitorPenalty))
}

function scoreFinancials(f: AgentOutputs['financials']): number {
  // ROI: 15%+ = 20, 10-15% = 15, 7-10% = 10, 5-7% = 5, <5% = 0
  const roiScore =
    f.roiPercent >= 15 ? 20
    : f.roiPercent >= 10 ? 15
    : f.roiPercent >= 7 ? 10
    : f.roiPercent >= 5 ? 5
    : 0

  // Break-even: < 60mo = 5, 60-120mo = 3, > 120mo = 0
  const breakEvenScore = f.breakEvenMonths < 60 ? 5 : f.breakEvenMonths <= 120 ? 3 : 0

  return Math.min(25, roiScore + breakEvenScore)
}

function scoreLicense(l: AgentOutputs['licenseCheck']): number {
  if (!l.eligible) return 0
  if (!l.propertyUseChangeable) return 3
  const obstaclesPenalty = Math.min(6, l.obstacles.length * 2)
  return Math.max(0, 10 - obstaclesPenalty)
}
```

- [ ] **Step 7: Create auto-drop rules**

Create `lib/scoring/drop-rules.ts`:
```typescript
import type { AgentOutputs } from '@/lib/agents/types'

export type DropResult = { drop: false } | { drop: true; reason: string }

export function checkDropRules(
  outputs: AgentOutputs,
  minimumBid: number,
  appraisalValue: number,
): DropResult {
  const { rightsAnalysis, licenseCheck, financials } = outputs

  if (rightsAnalysis.hasLegalSurfaceRight) {
    return { drop: true, reason: '법정지상권 성립 가능 — 소유권 취득 후에도 제3자 사용권 존재' }
  }

  if (rightsAnalysis.hasInjunction) {
    return { drop: true, reason: '가처분 등기 있음 — 소유권 이전 후 취소될 위험' }
  }

  if (!licenseCheck.eligible) {
    return { drop: true, reason: '숙박업 인허가 불가 — 용도변경 또는 법적 요건 미충족' }
  }

  if (financials.roiPercent < 5) {
    return {
      drop: true,
      reason: `ROI ${financials.roiPercent.toFixed(1)}% — 최소 기준(5%) 미달`,
    }
  }

  if (appraisalValue > 0 && minimumBid / appraisalValue > 1.2) {
    const ratio = ((minimumBid / appraisalValue) * 100).toFixed(1)
    return {
      drop: true,
      reason: `입찰가가 감정가의 ${ratio}% — 120% 초과 시 수익성 없음`,
    }
  }

  return { drop: false }
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="lib/scoring"
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/scoring/ lib/agents/types.ts __tests__/lib/scoring/
git commit -m "feat: add 100-point scoring engine and auto-drop rules"
```

---

### Task 3: Collector + Normalizer Agents

**Files:**
- Create: `lib/agents/collector.ts`
- Create: `lib/agents/normalizer.ts`
- Create: `__tests__/lib/agents/collector.test.ts`
- Create: `__tests__/lib/agents/normalizer.test.ts`

- [ ] **Step 1: Write failing test for collector**

Create `__tests__/lib/agents/collector.test.ts`:
```typescript
import { runCollector } from '@/lib/agents/collector'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findMany: jest.fn().mockResolvedValue([
        { id: '1', externalId: 'MOCK-001', source: 'mock', address: '강원도 평창군', isDropped: false },
        { id: '2', externalId: 'MOCK-002', source: 'mock', address: '제주도', isDropped: false },
      ]),
    },
  },
}))

describe('runCollector', () => {
  it('returns listings from the database', async () => {
    const results = await runCollector({ source: 'mock' })
    expect(results).toHaveLength(2)
    expect(results[0].externalId).toBe('MOCK-001')
  })

  it('returns empty array when no listings match', async () => {
    const { prisma } = jest.requireMock('@/lib/db/prisma')
    prisma.listing.findMany.mockResolvedValueOnce([])
    const results = await runCollector({ source: 'mock' })
    expect(results).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Write failing test for normalizer**

Create `__tests__/lib/agents/normalizer.test.ts`:
```typescript
import { runNormalizer } from '@/lib/agents/normalizer'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest.fn().mockResolvedValue({
    propertyDescription: '관광지 인근 펜션',
    estimatedRenovationCost: 5_000_000,
    notes: '2015년 건축, 상태 양호',
  }),
}))

describe('runNormalizer', () => {
  it('returns normalized listing with LLM-enriched fields', async () => {
    const input = {
      id: '1',
      address: '강원도 평창군 대관령면',
      area: 412.5,
      buildYear: 2015,
      rawData: null,
    }
    const result = await runNormalizer(input as any)
    expect(result.propertyDescription).toBe('관광지 인근 펜션')
    expect(result.estimatedRenovationCost).toBe(5_000_000)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="lib/agents/(collector|normalizer)"
```

Expected: FAIL

- [ ] **Step 4: Create collector agent**

Create `lib/agents/collector.ts`:
```typescript
import { prisma } from '@/lib/db/prisma'
import type { Listing } from '@prisma/client'

type CollectorOptions = {
  source?: string  // 'mock' | 'onbid' | etc.
  limit?: number
}

export async function runCollector(options: CollectorOptions = {}): Promise<Listing[]> {
  const { source = 'mock', limit = 100 } = options

  // Phase 1: reads from database (populated by seed or future real API adapters)
  // Phase 2: call real APIs (온비드, 법원경매, 공매), then upsert new listings
  const listings = await prisma.listing.findMany({
    where: {
      source,
      isDropped: false,
    },
    orderBy: { collectedAt: 'desc' },
    take: limit,
  })

  return listings
}
```

- [ ] **Step 5: Create normalizer agent**

Create `lib/agents/normalizer.ts`:
```typescript
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'

const NormalizerOutputSchema = z.object({
  propertyDescription: z.string().describe('1-2 문장 한국어 물건 요약'),
  estimatedRenovationCost: z.number().describe('예상 리모델링 비용 (KRW, 0이면 불필요)'),
  notes: z.string().describe('특이사항 또는 주의사항'),
})

export type NormalizerOutput = z.infer<typeof NormalizerOutputSchema> & {
  listingId: string
}

export async function runNormalizer(listing: Listing): Promise<NormalizerOutput> {
  const prompt = `
다음 경매/공매 매물을 분석하여 구조화된 정보를 추출하라.

매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
- 건축연도: ${listing.buildYear ?? '정보 없음'}
- 층수: ${listing.floorInfo ?? '정보 없음'}
- 최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
- 감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
- 유찰 횟수: ${listing.auctionCount}회

위 정보를 바탕으로:
1. 물건 특성 요약 (숙박업 관점에서)
2. 예상 리모델링 비용 (KRW, 건축연도/면적 기준 추정)
3. 특이사항 또는 주의사항
`.trim()

  const output = await callLLMStructured(prompt, NormalizerOutputSchema, 'fast')

  return {
    listingId: listing.id,
    ...output,
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="lib/agents/(collector|normalizer)"
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/agents/collector.ts lib/agents/normalizer.ts __tests__/lib/agents/
git commit -m "feat: add Collector and Normalizer agents"
```

---

### Task 4: Due Diligence Agent

**Files:**
- Create: `lib/agents/due-diligence.ts`
- Create: `__tests__/lib/agents/due-diligence.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/agents/due-diligence.test.ts`:
```typescript
import { runDueDiligence } from '@/lib/agents/due-diligence'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest
    .fn()
    .mockResolvedValueOnce({
      hasLien: false,
      hasInjunction: false,
      hasLegalSurfaceRight: false,
      hasOccupancy: false,
      hasUnpaidRent: false,
      hasTaxLien: false,
      clearanceEstimate: 0,
      summary: '권리관계 이상 없음',
    })
    .mockResolvedValueOnce({
      eligible: true,
      propertyUseChangeable: true,
      estimatedFee: 300000,
      obstacles: [],
      summary: '숙박업 등록 가능',
    }),
}))

describe('runDueDiligence', () => {
  it('returns rights analysis and license check', async () => {
    const listing = {
      id: '1',
      address: '강원도 평창군',
      propertyType: 'PENSION',
      listingType: 'AUCTION',
      court: '춘천지방법원',
      caseNumber: '2026타경12345',
    }

    const result = await runDueDiligence(listing as any)

    expect(result.rightsAnalysis.hasLien).toBe(false)
    expect(result.licenseCheck.eligible).toBe(true)
    expect(result.rightsAnalysis.summary).toBe('권리관계 이상 없음')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="lib/agents/due-diligence"
```

Expected: FAIL

- [ ] **Step 3: Create Due Diligence agent**

Create `lib/agents/due-diligence.ts`:
```typescript
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { RightsAnalysis, LicenseCheck } from './types'

const RightsSchema = z.object({
  hasLien: z.boolean().describe('저당권/근저당권 있음'),
  hasInjunction: z.boolean().describe('가처분/가압류 있음'),
  hasLegalSurfaceRight: z.boolean().describe('법정지상권 성립 가능성 있음'),
  hasOccupancy: z.boolean().describe('임차인 점유 있음'),
  hasUnpaidRent: z.boolean().describe('미납 임대료 있음'),
  hasTaxLien: z.boolean().describe('국세/지방세 체납 있음'),
  clearanceEstimate: z.number().describe('인수해야 할 권리 추정 금액 (KRW, 없으면 0)'),
  summary: z.string().describe('권리분석 요약 (2-3문장, 한국어)'),
})

const LicenseSchema = z.object({
  eligible: z.boolean().describe('숙박업 등록 가능 여부'),
  propertyUseChangeable: z.boolean().describe('건축물 용도변경 가능 여부'),
  estimatedFee: z.number().describe('인허가 예상 비용 (KRW)'),
  obstacles: z.array(z.string()).describe('장애 요인 목록'),
  summary: z.string().describe('인허가 가능성 요약 (2-3문장, 한국어)'),
})

const RIGHTS_SYSTEM = `당신은 한국 부동산 권리분석 전문가다.
경매/공매 매물의 권리관계를 분석하여 위험 요소를 식별한다.
Phase 1에서는 주소, 물건 종류, 법원, 사건번호로 추정 분석한다.
유찰 횟수가 많을수록 권리 문제 가능성이 높다고 가정한다.
실제 등기부등본 없이 분석하므로 보수적으로 평가하라.`

const LICENSE_SYSTEM = `당신은 한국 숙박업 인허가 전문 컨설턴트다.
관광진흥법, 공중위생관리법 기준으로 숙박업 등록 가능성을 판단한다.
물건 종류(호텔/펜션/게스트하우스/모텔)에 따라 적용 법령이 다르다.
펜션: 농어촌민박사업자 신고 (연면적 230m² 미만) 또는 관광펜션
호텔: 관광호텔업 등록 (관광진흥법)
게스트하우스: 외국인관광 도시민박업 또는 공중위생관리법 숙박업
모텔: 공중위생관리법 숙박업`

export type DueDiligenceOutput = {
  rightsAnalysis: RightsAnalysis
  licenseCheck: LicenseCheck
}

export async function runDueDiligence(listing: Listing): Promise<DueDiligenceOutput> {
  const context = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 거래 유형: ${listing.listingType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
- 건축연도: ${listing.buildYear ?? '정보 없음'}
- 최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
- 감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
- 유찰 횟수: ${listing.auctionCount}회
${listing.court ? `- 관할 법원: ${listing.court}` : ''}
${listing.caseNumber ? `- 사건번호: ${listing.caseNumber}` : ''}
`.trim()

  const [rightsAnalysis, licenseCheck] = await Promise.all([
    callLLMStructured(
      `${context}\n\n위 매물의 권리관계를 분석하라.`,
      RightsSchema,
      'standard',
      RIGHTS_SYSTEM,
    ),
    callLLMStructured(
      `${context}\n\n위 매물의 숙박업 인허가 가능성을 분석하라.`,
      LicenseSchema,
      'standard',
      LICENSE_SYSTEM,
    ),
  ])

  return { rightsAnalysis, licenseCheck }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="lib/agents/due-diligence"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/agents/due-diligence.ts __tests__/lib/agents/due-diligence.test.ts
git commit -m "feat: add Due Diligence agent (rights analysis + license check)"
```

---

### Task 5: Risk + Commercial Area Agents

**Files:**
- Create: `lib/agents/risk.ts`
- Create: `lib/agents/commercial.ts`
- Create: `__tests__/lib/agents/risk.test.ts`
- Create: `__tests__/lib/agents/commercial.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/agents/risk.test.ts`:
```typescript
import { runRisk } from '@/lib/agents/risk'
import type { AgentOutputs } from '@/lib/agents/types'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest.fn().mockResolvedValue({
    level: 'LOW',
    factors: ['건축연도 오래됨 — 리모델링 필요'],
    summary: '주요 위험 없음, 건물 노후화만 주의',
  }),
}))

const partialOutputs = {
  rightsAnalysis: {
    hasLien: false, hasInjunction: false, hasLegalSurfaceRight: false,
    hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false,
    clearanceEstimate: 0, summary: '',
  },
  licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '' },
  commercialArea: { touristProximityScore: 75, competitorCount: 3, occupancyRateBenchmark: 70, averageDailyRate: 100000, summary: '' },
  financials: { estimatedMonthlyRevenue: 8000000, estimatedMonthlyCost: 4000000, estimatedMonthlyProfit: 4000000, roiPercent: 9.6, breakEvenMonths: 100, summary: '' },
}

describe('runRisk', () => {
  it('returns risk level and factors', async () => {
    const listing = { id: '1', address: '강원도', propertyType: 'PENSION', buildYear: 2000, auctionCount: 1 }
    const result = await runRisk(listing as any, partialOutputs as AgentOutputs)
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.level)
    expect(Array.isArray(result.factors)).toBe(true)
  })
})
```

Create `__tests__/lib/agents/commercial.test.ts`:
```typescript
import { runCommercial } from '@/lib/agents/commercial'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest.fn().mockResolvedValue({
    touristProximityScore: 82,
    competitorCount: 4,
    occupancyRateBenchmark: 73,
    averageDailyRate: 115000,
    summary: '평창 올림픽 시설 인근, 스키 시즌 수요 높음',
  }),
}))

describe('runCommercial', () => {
  it('returns commercial area analysis', async () => {
    const listing = { id: '1', address: '강원도 평창군 대관령면', propertyType: 'PENSION', area: 412 }
    const result = await runCommercial(listing as any)
    expect(result.touristProximityScore).toBeGreaterThanOrEqual(0)
    expect(result.touristProximityScore).toBeLessThanOrEqual(100)
    expect(result.averageDailyRate).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="lib/agents/(risk|commercial)"
```

Expected: FAIL

- [ ] **Step 3: Create Commercial agent**

Create `lib/agents/commercial.ts`:
```typescript
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { CommercialArea } from './types'

const CommercialSchema = z.object({
  touristProximityScore: z.number().min(0).max(100).describe('관광지 접근성 점수 (0-100)'),
  competitorCount: z.number().int().min(0).describe('반경 2km 내 유사 숙박업체 추정 수'),
  occupancyRateBenchmark: z.number().min(0).max(100).describe('동일 지역 숙박업 평균 점유율 (%)'),
  averageDailyRate: z.number().min(0).describe('동일 등급 객실 평균 1박 요금 (KRW)'),
  summary: z.string().describe('상권 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 한국 숙박업 상권 분석 전문가다.
소상공인시장진흥공단 상권정보 및 관광지 데이터를 기반으로 분석한다.
Phase 1에서는 주소와 물건 종류로 추정 분석한다.
계절성(스키/여름 해수욕 등)을 반드시 고려하라.`

export async function runCommercial(listing: Listing): Promise<CommercialArea> {
  const prompt = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}

이 위치의 숙박업 상권을 분석하라. 관광지 접근성, 경쟁 현황, 시장 벤치마크를 포함하라.
`.trim()

  return callLLMStructured(prompt, CommercialSchema, 'standard', SYSTEM)
}
```

- [ ] **Step 4: Create Financials calculation (deterministic, no LLM)**

Create `lib/agents/financials.ts`:
```typescript
import type { CommercialArea, Financials } from './types'

type FinancialsInput = {
  minimumBid: number
  area: number
  commercialArea: CommercialArea
  estimatedRenovationCost: number
}

export function calculateFinancials(input: FinancialsInput): Financials {
  const { minimumBid, area, commercialArea, estimatedRenovationCost } = input

  // Revenue: rooms × ADR × occupancy × days
  // Rough room count: area / 30m² per room
  const estimatedRooms = Math.max(1, Math.floor(area / 30))
  const occupancyDecimal = commercialArea.occupancyRateBenchmark / 100
  const estimatedMonthlyRevenue = Math.round(
    estimatedRooms * commercialArea.averageDailyRate * occupancyDecimal * 30
  )

  // Costs: 40% of revenue + fixed costs
  const variableCosts = estimatedMonthlyRevenue * 0.4
  const fixedCosts = 1_500_000 + (area * 5000) // utilities + maintenance
  const estimatedMonthlyCost = Math.round(variableCosts + fixedCosts)

  const estimatedMonthlyProfit = estimatedMonthlyRevenue - estimatedMonthlyCost

  // Annual ROI = annual profit / total investment
  const totalInvestment = minimumBid + estimatedRenovationCost
  const roiPercent =
    totalInvestment > 0
      ? Math.round((estimatedMonthlyProfit * 12 / totalInvestment) * 1000) / 10
      : 0

  const breakEvenMonths =
    estimatedMonthlyProfit > 0
      ? Math.ceil(totalInvestment / estimatedMonthlyProfit)
      : 999

  const summary = `월 예상 매출 ${(estimatedMonthlyRevenue / 10000).toFixed(0)}만원, ` +
    `월 예상 순이익 ${(estimatedMonthlyProfit / 10000).toFixed(0)}만원, ` +
    `연 ROI ${roiPercent.toFixed(1)}%, 손익분기 ${breakEvenMonths}개월`

  return {
    estimatedMonthlyRevenue,
    estimatedMonthlyCost,
    estimatedMonthlyProfit,
    roiPercent,
    breakEvenMonths,
    summary,
  }
}
```

- [ ] **Step 5: Create Risk agent**

Create `lib/agents/risk.ts`:
```typescript
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs, RiskFactors } from './types'

const RiskSchema = z.object({
  level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('전체 위험 수준'),
  factors: z.array(z.string()).describe('위험 요인 목록 (한국어, 각 1문장)'),
  summary: z.string().describe('위험 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 부동산 투자 리스크 분석 전문가다.
권리분석, 인허가, 상권, 수익성 데이터를 종합하여 투자 위험을 평가한다.
위험 수준: LOW(양호), MEDIUM(주의), HIGH(위험), CRITICAL(투자 불가)`

export async function runRisk(
  listing: Listing,
  outputs: Omit<AgentOutputs, 'riskFactors' | 'strategy'>,
): Promise<RiskFactors> {
  const prompt = `
매물: ${listing.address} (${listing.propertyType}, ${listing.listingType})
건축연도: ${listing.buildYear ?? '미상'}, 유찰: ${listing.auctionCount}회

[권리분석]
- 저당권: ${outputs.rightsAnalysis.hasLien}
- 가처분: ${outputs.rightsAnalysis.hasInjunction}
- 법정지상권: ${outputs.rightsAnalysis.hasLegalSurfaceRight}
- 점유: ${outputs.rightsAnalysis.hasOccupancy}
- 인수 금액 추정: ${(outputs.rightsAnalysis.clearanceEstimate / 10000).toFixed(0)}만원

[인허가]
- 가능 여부: ${outputs.licenseCheck.eligible}
- 장애 요인: ${outputs.licenseCheck.obstacles.join(', ') || '없음'}

[상권]
- 관광지 접근성: ${outputs.commercialArea.touristProximityScore}/100
- 경쟁업체 수: ${outputs.commercialArea.competitorCount}개

[수익성]
- 연 ROI: ${outputs.financials.roiPercent.toFixed(1)}%
- 손익분기: ${outputs.financials.breakEvenMonths}개월

위 정보를 종합하여 투자 리스크를 평가하라.
`.trim()

  return callLLMStructured(prompt, RiskSchema, 'standard', SYSTEM)
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="lib/agents/(risk|commercial)"
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/agents/commercial.ts lib/agents/financials.ts lib/agents/risk.ts __tests__/lib/agents/
git commit -m "feat: add Commercial, Financials, and Risk agents"
```

---

### Task 6: Strategy + Report Agents

**Files:**
- Create: `lib/agents/strategy.ts`
- Create: `lib/agents/report.ts`
- Create: `__tests__/lib/agents/strategy.test.ts`
- Create: `__tests__/lib/agents/report.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/agents/strategy.test.ts`:
```typescript
import { runStrategy } from '@/lib/agents/strategy'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest.fn().mockResolvedValue({
    recommendedBid: 630_000_000,
    operatingModel: '직접 운영 (펜션)',
    keyActions: ['리모델링 실시', '소셜미디어 채널 개설', '플랫폼 등록'],
    summary: '감정가 대비 74%에 입찰, 직접 운영 권장',
  }),
}))

describe('runStrategy', () => {
  it('returns recommended bid and operating model', async () => {
    const listing = { id: '1', minimumBid: BigInt(595_000_000), appraisalValue: BigInt(850_000_000) }
    const outputs = {
      rightsAnalysis: { hasLien: false, hasInjunction: false, hasLegalSurfaceRight: false, hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false, clearanceEstimate: 0, summary: '' },
      licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '' },
      commercialArea: { touristProximityScore: 80, competitorCount: 3, occupancyRateBenchmark: 72, averageDailyRate: 120000, summary: '' },
      financials: { estimatedMonthlyRevenue: 12000000, estimatedMonthlyCost: 5000000, estimatedMonthlyProfit: 7000000, roiPercent: 14.1, breakEvenMonths: 84, summary: '' },
      riskFactors: { level: 'LOW' as const, factors: [], summary: '' },
    }
    const result = await runStrategy(listing as any, outputs)
    expect(result.recommendedBid).toBeGreaterThan(0)
    expect(result.keyActions.length).toBeGreaterThan(0)
  })
})
```

Create `__tests__/lib/agents/report.test.ts`:
```typescript
import { runReport } from '@/lib/agents/report'

jest.mock('@/lib/llm/client', () => ({
  callLLM: jest.fn().mockResolvedValue('# 투자 분석 보고서\n\n## 요약\n우수한 투자 매물입니다.'),
}))

describe('runReport', () => {
  it('returns report with title and content', async () => {
    const listing = { id: '1', address: '강원도 평창군', propertyType: 'PENSION', minimumBid: BigInt(595_000_000) }
    const outputs = {
      rightsAnalysis: { hasLien: false, hasInjunction: false, hasLegalSurfaceRight: false, hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false, clearanceEstimate: 0, summary: '이상 없음' },
      licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '등록 가능' },
      commercialArea: { touristProximityScore: 80, competitorCount: 3, occupancyRateBenchmark: 72, averageDailyRate: 120000, summary: '양호' },
      financials: { estimatedMonthlyRevenue: 12000000, estimatedMonthlyCost: 5000000, estimatedMonthlyProfit: 7000000, roiPercent: 14.1, breakEvenMonths: 84, summary: '수익성 양호' },
      riskFactors: { level: 'LOW' as const, factors: [], summary: '위험 낮음' },
      strategy: { recommendedBid: 630000000, operatingModel: '직접 운영', keyActions: ['리모델링'], summary: '권장' },
    }
    const score = { total: 78, breakdown: { rights: 28, commercial: 20, financials: 18, license: 8, condition: 4 } }
    const result = await runReport(listing as any, outputs, score)
    expect(result.title).toBeTruthy()
    expect(result.summary).toBeTruthy()
    expect(result.fullReport).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="lib/agents/(strategy|report)"
```

Expected: FAIL

- [ ] **Step 3: Create Strategy agent**

Create `lib/agents/strategy.ts`:
```typescript
import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs, Strategy } from './types'

const StrategySchema = z.object({
  recommendedBid: z.number().describe('권장 입찰가 (KRW)'),
  operatingModel: z.string().describe('권장 운영 모델 (예: 직접 운영, 위탁 운영, 임대)'),
  keyActions: z.array(z.string()).describe('핵심 실행 과제 목록 (한국어, 각 1문장, 3-5개)'),
  summary: z.string().describe('전략 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 부동산 투자 전략 컨설턴트다.
분석된 데이터를 바탕으로 최적의 입찰 전략과 운영 계획을 제시한다.
입찰가는 수익성과 경쟁 상황을 고려하여 감정가 대비 비율로 제시한다.`

export async function runStrategy(listing: Listing, outputs: AgentOutputs): Promise<Strategy> {
  const prompt = `
매물: ${listing.address} (${listing.propertyType})
최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
유찰 횟수: ${listing.auctionCount}회

[분석 요약]
- 권리분석: ${outputs.rightsAnalysis.summary}
- 인허가: ${outputs.licenseCheck.summary}
- 상권: ${outputs.commercialArea.summary}
- 수익성: ${outputs.financials.summary}
- 위험도: ${outputs.riskFactors.level} — ${outputs.riskFactors.summary}

위 분석을 바탕으로 최적의 입찰 전략과 운영 계획을 수립하라.
`.trim()

  return callLLMStructured(prompt, StrategySchema, 'standard', SYSTEM)
}
```

- [ ] **Step 4: Create Report agent**

Create `lib/agents/report.ts`:
```typescript
import { callLLM } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs } from './types'
import type { ScoreResult } from '@/lib/scoring/types'

export type ReportOutput = {
  title: string
  summary: string
  fullReport: string
  recommendedBid: number
  expectedRoi: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'PASS' | 'AVOID'
}

const SYSTEM = `당신은 부동산 투자 분석 보고서 작성 전문가다.
제공된 분석 데이터를 바탕으로 투자자가 읽기 쉬운 한국어 보고서를 작성한다.
보고서는 마크다운 형식으로 작성하며, 구체적인 수치를 포함해야 한다.`

function getRecommendation(score: number, riskLevel: string): ReportOutput['recommendation'] {
  if (riskLevel === 'CRITICAL') return 'AVOID'
  if (score >= 80 && riskLevel === 'LOW') return 'STRONG_BUY'
  if (score >= 70) return 'BUY'
  if (score >= 55) return 'NEUTRAL'
  if (score >= 40) return 'PASS'
  return 'AVOID'
}

export async function runReport(
  listing: Listing,
  outputs: AgentOutputs,
  score: ScoreResult,
): Promise<ReportOutput> {
  const { rightsAnalysis, licenseCheck, commercialArea, financials, riskFactors, strategy } = outputs

  const prompt = `
다음 부동산 투자 분석 데이터를 바탕으로 종합 투자 보고서를 작성하라.

## 매물 기본정보
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType} (${listing.listingType})
- 최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
- 감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
- 면적: ${listing.area ? `${listing.area}m²` : '미상'}
- 건축연도: ${listing.buildYear ?? '미상'}

## 분석 결과 요약
- 종합 점수: ${score.total}/100점
  - 권리분석: ${score.breakdown.rights}/30
  - 상권/입지: ${score.breakdown.commercial}/25
  - 수익성: ${score.breakdown.financials}/25
  - 인허가: ${score.breakdown.license}/10
  - 건물상태: ${score.breakdown.condition}/10

## 권리분석
${rightsAnalysis.summary}

## 인허가 가능성
${licenseCheck.summary}

## 상권 분석
${commercialArea.summary}
- 관광지 접근성: ${commercialArea.touristProximityScore}/100
- 평균 객실 단가: ${(commercialArea.averageDailyRate / 10000).toFixed(0)}만원/박
- 지역 평균 점유율: ${commercialArea.occupancyRateBenchmark}%

## 수익성 분석
${financials.summary}
- 월 예상 매출: ${(financials.estimatedMonthlyRevenue / 10000).toFixed(0)}만원
- 월 예상 순이익: ${(financials.estimatedMonthlyProfit / 10000).toFixed(0)}만원
- 연 ROI: ${financials.roiPercent.toFixed(1)}%
- 손익분기: ${financials.breakEvenMonths}개월

## 위험도 평가
수준: ${riskFactors.level}
${riskFactors.summary}
${riskFactors.factors.map((f) => `- ${f}`).join('\n')}

## 투자 전략
${strategy ? strategy.summary : '전략 분석 미수행'}
${strategy ? `권장 입찰가: ${(strategy.recommendedBid / 100_000_000).toFixed(1)}억원` : ''}

---

위 데이터를 바탕으로 다음 구조의 보고서를 작성하라:
1. 핵심 요약 (3-4문장)
2. 권리관계 검토
3. 인허가 가능성
4. 상권 및 입지 분석
5. 수익성 분석 (표 포함)
6. 위험 요소
7. 투자 추천 의견
8. 실행 계획

모든 내용은 한국어로 작성하고 마크다운 형식을 사용하라.
`.trim()

  const fullReport = await callLLM(prompt, 'premium', SYSTEM)

  const firstLine = fullReport.split('\n').find((l) => l.trim())?.replace(/^#+ /, '') ?? '투자 분석 보고서'
  const summary = fullReport.split('\n').filter((l) => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ')

  return {
    title: `[${score.total}점] ${listing.address} 투자 분석`,
    summary: summary.slice(0, 500),
    fullReport,
    recommendedBid: strategy?.recommendedBid ?? Number(listing.minimumBid),
    expectedRoi: financials.roiPercent,
    riskLevel: riskFactors.level,
    recommendation: getRecommendation(score.total, riskFactors.level),
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="lib/agents/(strategy|report)"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/agents/strategy.ts lib/agents/report.ts __tests__/lib/agents/
git commit -m "feat: add Strategy and Report agents"
```

---

### Task 7: Pipeline Orchestrator

**Files:**
- Create: `lib/pipeline/orchestrator.ts`
- Create: `__tests__/lib/pipeline/orchestrator.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/pipeline/orchestrator.test.ts`:
```typescript
import { runPipeline } from '@/lib/pipeline/orchestrator'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    analysis: {
      create: jest.fn().mockResolvedValue({ id: 'analysis-1' }),
      update: jest.fn().mockResolvedValue({ id: 'analysis-1' }),
    },
    report: {
      create: jest.fn().mockResolvedValue({ id: 'report-1' }),
    },
    listing: {
      update: jest.fn().mockResolvedValue({}),
    },
    pipelineRun: {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('@/lib/agents/normalizer', () => ({
  runNormalizer: jest.fn().mockResolvedValue({ listingId: '1', propertyDescription: 'Test', estimatedRenovationCost: 0, notes: '' }),
}))
jest.mock('@/lib/agents/due-diligence', () => ({
  runDueDiligence: jest.fn().mockResolvedValue({
    rightsAnalysis: { hasLien: false, hasInjunction: false, hasLegalSurfaceRight: false, hasOccupancy: false, hasUnpaidRent: false, hasTaxLien: false, clearanceEstimate: 0, summary: '' },
    licenseCheck: { eligible: true, propertyUseChangeable: true, estimatedFee: 0, obstacles: [], summary: '' },
  }),
}))
jest.mock('@/lib/agents/commercial', () => ({
  runCommercial: jest.fn().mockResolvedValue({ touristProximityScore: 70, competitorCount: 3, occupancyRateBenchmark: 68, averageDailyRate: 100000, summary: '' }),
}))
jest.mock('@/lib/agents/financials', () => ({
  calculateFinancials: jest.fn().mockReturnValue({ estimatedMonthlyRevenue: 8000000, estimatedMonthlyCost: 4000000, estimatedMonthlyProfit: 4000000, roiPercent: 9.6, breakEvenMonths: 100, summary: '' }),
}))
jest.mock('@/lib/agents/risk', () => ({
  runRisk: jest.fn().mockResolvedValue({ level: 'LOW', factors: [], summary: '' }),
}))
jest.mock('@/lib/agents/strategy', () => ({
  runStrategy: jest.fn().mockResolvedValue({ recommendedBid: 600000000, operatingModel: 'direct', keyActions: [], summary: '' }),
}))
jest.mock('@/lib/agents/report', () => ({
  runReport: jest.fn().mockResolvedValue({ title: 'Test', summary: 'Summary', fullReport: '# Report', recommendedBid: 600000000, expectedRoi: 9.6, riskLevel: 'LOW', recommendation: 'BUY' }),
}))
jest.mock('@/lib/scoring/engine', () => ({
  calculateScore: jest.fn().mockReturnValue({ total: 75, breakdown: { rights: 28, commercial: 18, financials: 17, license: 8, condition: 4 } }),
}))
jest.mock('@/lib/scoring/drop-rules', () => ({
  checkDropRules: jest.fn().mockReturnValue({ drop: false }),
}))

describe('runPipeline', () => {
  it('completes pipeline for a listing without dropping', async () => {
    const listing = {
      id: '1',
      address: '강원도 평창군',
      propertyType: 'PENSION',
      listingType: 'AUCTION',
      minimumBid: BigInt(595_000_000),
      appraisalValue: BigInt(850_000_000),
      area: 412,
      buildYear: 2015,
      auctionCount: 1,
      isDropped: false,
    }

    const result = await runPipeline(listing as any)

    expect(result.status).toBe('COMPLETED')
    expect(result.score).toBe(75)
    expect(result.dropped).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="lib/pipeline/orchestrator"
```

Expected: FAIL

- [ ] **Step 3: Create pipeline orchestrator**

Create `lib/pipeline/orchestrator.ts`:
```typescript
import { prisma } from '@/lib/db/prisma'
import type { Listing } from '@prisma/client'
import { runNormalizer } from '@/lib/agents/normalizer'
import { runDueDiligence } from '@/lib/agents/due-diligence'
import { runCommercial } from '@/lib/agents/commercial'
import { calculateFinancials } from '@/lib/agents/financials'
import { runRisk } from '@/lib/agents/risk'
import { runStrategy } from '@/lib/agents/strategy'
import { runReport } from '@/lib/agents/report'
import { calculateScore } from '@/lib/scoring/engine'
import { checkDropRules } from '@/lib/scoring/drop-rules'
import type { AgentOutputs } from '@/lib/agents/types'

export type PipelineResult = {
  listingId: string
  analysisId: string
  reportId?: string
  status: 'COMPLETED' | 'DROPPED' | 'FAILED'
  score?: number
  recommendation?: string
  dropped: boolean
  droppedReason?: string
  error?: string
}

export async function runPipeline(listing: Listing): Promise<PipelineResult> {
  const analysis = await prisma.analysis.create({
    data: {
      listingId: listing.id,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  try {
    // Step 1: Normalize
    const normalized = await runNormalizer(listing)

    // Step 2: Due Diligence (parallel: rights + license)
    const { rightsAnalysis, licenseCheck } = await runDueDiligence(listing)

    // Step 3: Commercial area
    const commercialArea = await runCommercial(listing)

    // Step 4: Financials (deterministic)
    const financials = calculateFinancials({
      minimumBid: Number(listing.minimumBid),
      area: listing.area ?? 200,
      commercialArea,
      estimatedRenovationCost: normalized.estimatedRenovationCost,
    })

    // Step 5: Check auto-drop rules before expensive agents
    const partialOutputs: Omit<AgentOutputs, 'riskFactors' | 'strategy'> = {
      rightsAnalysis,
      licenseCheck,
      commercialArea,
      financials,
    }

    const dropCheck = checkDropRules(
      { ...partialOutputs, riskFactors: { level: 'LOW', factors: [], summary: '' } },
      Number(listing.minimumBid),
      Number(listing.appraisalValue),
    )

    if (dropCheck.drop) {
      await Promise.all([
        prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            rightsAnalysis,
            licenseCheck,
            commercialArea,
            financials,
            status: 'DROPPED',
            completedAt: new Date(),
          },
        }),
        prisma.listing.update({
          where: { id: listing.id },
          data: { isDropped: true, droppedReason: dropCheck.reason },
        }),
      ])

      return {
        listingId: listing.id,
        analysisId: analysis.id,
        status: 'DROPPED',
        dropped: true,
        droppedReason: dropCheck.reason,
      }
    }

    // Step 6: Risk assessment
    const riskFactors = await runRisk(listing, partialOutputs as AgentOutputs)

    const outputs: AgentOutputs = { ...partialOutputs, riskFactors }

    // Step 7: Score
    const score = calculateScore(outputs)

    // Step 8: Strategy
    const strategy = await runStrategy(listing, outputs)
    outputs.strategy = strategy

    // Step 9: Report (uses premium model)
    const reportOutput = await runReport(listing, outputs, score)

    // Persist analysis
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        rightsAnalysis,
        licenseCheck,
        commercialArea,
        financials,
        riskFactors,
        strategy,
        score: score.total,
        scoreBreakdown: score.breakdown,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Persist report
    const report = await prisma.report.create({
      data: {
        analysisId: analysis.id,
        title: reportOutput.title,
        summary: reportOutput.summary,
        fullReport: reportOutput.fullReport,
        recommendedBid: reportOutput.recommendedBid,
        expectedRoi: reportOutput.expectedRoi,
        riskLevel: reportOutput.riskLevel,
        recommendation: reportOutput.recommendation,
      },
    })

    // Update listing score cache
    await prisma.listing.update({
      where: { id: listing.id },
      data: { score: score.total },
    })

    return {
      listingId: listing.id,
      analysisId: analysis.id,
      reportId: report.id,
      status: 'COMPLETED',
      score: score.total,
      recommendation: reportOutput.recommendation,
      dropped: false,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    })

    return {
      listingId: listing.id,
      analysisId: analysis.id,
      status: 'FAILED',
      dropped: false,
      error: errorMessage,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="lib/pipeline/orchestrator"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/pipeline/ __tests__/lib/pipeline/
git commit -m "feat: add pipeline orchestrator — sequences 6 agents and persists results"
```

---

### Task 8: Pipeline API Routes

**Files:**
- Create: `app/api/listings/[id]/analyze/route.ts`
- Create: `app/api/pipeline/trigger/route.ts`
- Create: `app/api/pipeline/status/[runId]/route.ts`
- Create: `__tests__/app/api/listings/[id]/analyze/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/listings/[id]/analyze/route.test.ts`:
```typescript
import { POST } from '@/app/api/listings/[id]/analyze/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'listing-1',
        address: '강원도',
        propertyType: 'PENSION',
        isDropped: false,
      }),
    },
  },
}))

jest.mock('@/lib/pipeline/orchestrator', () => ({
  runPipeline: jest.fn().mockResolvedValue({
    listingId: 'listing-1',
    analysisId: 'analysis-1',
    status: 'COMPLETED',
    score: 75,
    dropped: false,
  }),
}))

describe('POST /api/listings/[id]/analyze', () => {
  it('triggers analysis and returns result', async () => {
    const req = new NextRequest('http://localhost/api/listings/listing-1/analyze', { method: 'POST' })
    const res = await POST(req, { params: { id: 'listing-1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('COMPLETED')
    expect(body.score).toBe(75)
  })

  it('returns 404 for unknown listing', async () => {
    const { prisma } = jest.requireMock('@/lib/db/prisma')
    prisma.listing.findUnique.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/listings/unknown/analyze', { method: 'POST' })
    const res = await POST(req, { params: { id: 'unknown' } })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="api/listings/.*analyze"
```

Expected: FAIL

- [ ] **Step 3: Create analyze route**

Create `app/api/listings/[id]/analyze/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { runPipeline } from '@/lib/pipeline/orchestrator'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listing = await prisma.listing.findUnique({ where: { id: params.id } })
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (listing.isDropped) {
    return NextResponse.json({ error: 'Listing is dropped', reason: listing.droppedReason }, { status: 400 })
  }

  const result = await runPipeline(listing)
  return NextResponse.json(result)
}
```

- [ ] **Step 4: Create bulk pipeline trigger**

Create `app/api/pipeline/trigger/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { runPipeline } from '@/lib/pipeline/orchestrator'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await prisma.pipelineRun.create({
    data: { status: 'RUNNING' },
  })

  const listings = await prisma.listing.findMany({
    where: { isDropped: false, score: null },
    take: 20,
  })

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: { totalItems: listings.length },
  })

  // Run in background — do not await
  ;(async () => {
    let processed = 0
    let failed = 0
    let dropped = 0

    for (const listing of listings) {
      const result = await runPipeline(listing)
      if (result.status === 'FAILED') failed++
      else if (result.status === 'DROPPED') dropped++
      else processed++

      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { processed, failed, dropped },
      })
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: failed === listings.length ? 'FAILED' : dropped + failed > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
      },
    })
  })()

  return NextResponse.json({ runId: run.id, totalItems: listings.length })
}
```

- [ ] **Step 5: Create pipeline status route**

Create `app/api/pipeline/status/[runId]/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await prisma.pipelineRun.findUnique({ where: { id: params.runId } })
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(run)
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- --testPathPattern="api/listings/.*analyze"
```

Expected: PASS

- [ ] **Step 7: Run full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add app/api/ __tests__/app/api/
git commit -m "feat: add analyze endpoint and pipeline trigger/status API routes"
```

---

## Phase 1B Complete ✅

At this checkpoint:

| Feature | Status |
|---------|--------|
| LLM client (tier-based: Haiku/Sonnet/Opus) | ✅ |
| 100-point scoring engine | ✅ |
| Auto-drop rules (6 rules) | ✅ |
| Collector agent (reads DB) | ✅ |
| Normalizer agent (LLM field extraction) | ✅ |
| Due Diligence agent (권리분석 + 인허가) | ✅ |
| Commercial area agent | ✅ |
| Financials calculator | ✅ |
| Risk agent | ✅ |
| Strategy agent | ✅ |
| Report agent (premium LLM) | ✅ |
| Pipeline orchestrator | ✅ |
| `/api/listings/[id]/analyze` POST | ✅ |
| `/api/pipeline/trigger` POST | ✅ |
| `/api/pipeline/status/[runId]` GET | ✅ |
| All tests passing | ✅ |

**Next:** [Phase 1C — Frontend + Automation](./2026-06-08-phase1c-frontend-automation.md)
