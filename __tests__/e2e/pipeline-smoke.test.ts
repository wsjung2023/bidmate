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
