import { runReport } from '@/lib/agents/report'

jest.mock('@/lib/llm/client', () => ({
  callLLM: jest.fn().mockResolvedValue('# 투자 분석 보고서\n\n## 요약\n우수한 투자 매물입니다.'),
}))

describe('runReport', () => {
  it('returns report with title and content', async () => {
    const listing = { id: '1', address: '강원도 평창군', propertyType: 'PENSION', listingType: 'AUCTION', minimumBid: BigInt(595_000_000), appraisalValue: BigInt(850_000_000), area: 412, buildYear: 2015, auctionCount: 1 }
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
