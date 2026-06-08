import { runDueDiligence } from '@/lib/agents/due-diligence'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest
    .fn()
    // First call: rights analysis (index 0 in Promise.all)
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
    // Second call: license check (index 1 in Promise.all)
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
      minimumBid: 595_000_000n,
      appraisalValue: 850_000_000n,
      area: 412,
      buildYear: 2015,
      auctionCount: 1,
      court: '춘천지방법원',
      caseNumber: '2026타경12345',
    }

    const result = await runDueDiligence(listing as any)

    expect(result.rightsAnalysis.hasLien).toBe(false)
    expect(result.rightsAnalysis.hasLegalSurfaceRight).toBe(false)
    expect(result.rightsAnalysis.clearanceEstimate).toBe(0)
    expect(result.rightsAnalysis.summary).toBe('권리관계 이상 없음')
    expect(result.licenseCheck.eligible).toBe(true)
    expect(result.licenseCheck.propertyUseChangeable).toBe(true)
    expect(result.licenseCheck.estimatedFee).toBe(300000)
    expect(result.licenseCheck.summary).toBe('숙박업 등록 가능')
  })
})
