import { runCollector } from '@/lib/agents/collector'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findMany: jest.fn().mockResolvedValue([
        { id: '1', externalId: 'MOCK-001', source: 'mock', address: '강원도 평창군', isDropped: false },
        { id: '2', externalId: 'MOCK-002', source: 'mock', address: '제주도', isDropped: false },
      ]),
    },
  },
}))

describe('runCollector', () => {
  it('returns listings from the database', async () => {
    const results = await runCollector({ source: 'mock' })
    expect(results).toHaveLength(2)
    expect(results[0].externalId).toBe('MOCK-001')
  })

  it('returns empty array when no listings match', async () => {
    const { prisma } = jest.requireMock('@/lib/db/prisma')
    prisma.listing.findMany.mockResolvedValueOnce([])
    const results = await runCollector({ source: 'mock' })
    expect(results).toHaveLength(0)
  })
})
