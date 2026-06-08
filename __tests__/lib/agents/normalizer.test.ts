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
    const input = {
      id: '1',
      address: '강원도 평창군 대관령면',
      area: 412.5,
      buildYear: 2015,
      rawData: null,
    }
    const result = await runNormalizer(input as any)
    expect(result.propertyDescription).toBe('관광지 인근 펜션')
    expect(result.estimatedRenovationCost).toBe(5_000_000)
  })
})
