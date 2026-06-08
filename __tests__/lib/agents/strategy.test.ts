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
    const listing = { id: '1', minimumBid: BigInt(595_000_000), appraisalValue: BigInt(850_000_000), auctionCount: 1, address: '강원도 평창군', propertyType: 'PENSION' }
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
