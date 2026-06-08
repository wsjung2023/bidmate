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
