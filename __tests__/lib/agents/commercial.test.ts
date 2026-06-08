import { runCommercial } from '@/lib/agents/commercial'

jest.mock('@/lib/llm/client', () => ({
  callLLMStructured: jest.fn().mockResolvedValue({
    touristProximityScore: 82,
    competitorCount: 4,
    occupancyRateBenchmark: 73,
    averageDailyRate: 115000,
    summary: '평창 올림픽 시설 인근, 스키 시즌 수요 높음',
  }),
}))

describe('runCommercial', () => {
  it('returns commercial area analysis', async () => {
    const listing = { id: '1', address: '강원도 평창군 대관령면', propertyType: 'PENSION', area: 412 }
    const result = await runCommercial(listing as any)
    expect(result.touristProximityScore).toBeGreaterThanOrEqual(0)
    expect(result.touristProximityScore).toBeLessThanOrEqual(100)
    expect(result.averageDailyRate).toBeGreaterThan(0)
  })
})
