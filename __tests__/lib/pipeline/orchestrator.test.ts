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
