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
