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
