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
    const input: import('@prisma/client').Listing = {
      id: '1',
      externalId: 'MOCK-001',
      source: 'mock',
      listingType: 'AUCTION',
      propertyType: 'PENSION',
      address: '강원도 평창군 대관령면',
      addressDetail: null,
      area: 412.5,
      buildYear: 2015,
      floorInfo: null,
      auctionCount: 1,
      minimumBid: 595_000_000n,
      appraisalValue: 850_000_000n,
      collectedAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      rawData: null,
      court: null,
      caseNumber: null,
      auctionDate: null,
      isDropped: false,
      droppedReason: null,
      score: null,
      latitude: null,
      longitude: null,
    }
    const result = await runNormalizer(input)
    expect(result.listingId).toBe('1')
    expect(result.propertyDescription).toBe('관광지 인근 펜션')
    expect(result.estimatedRenovationCost).toBe(5_000_000)
    expect(result.notes).toBe('2015년 건축, 상태 양호')
  })
})
