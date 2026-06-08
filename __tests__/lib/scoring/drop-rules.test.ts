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
