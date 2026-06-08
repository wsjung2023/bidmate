/**
 * @jest-environment node
 */
import { POST } from '@/app/api/listings/[id]/analyze/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'listing-1',
        address: '강원도',
        propertyType: 'PENSION',
        isDropped: false,
      }),
    },
  },
}))

jest.mock('@/lib/pipeline/orchestrator', () => ({
  runPipeline: jest.fn().mockResolvedValue({
    listingId: 'listing-1',
    analysisId: 'analysis-1',
    status: 'COMPLETED',
    score: 75,
    dropped: false,
  }),
}))

describe('POST /api/listings/[id]/analyze', () => {
  it('triggers analysis and returns result', async () => {
    const req = new NextRequest('http://localhost/api/listings/listing-1/analyze', { method: 'POST' })
    const res = await POST(req, { params: { id: 'listing-1' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('COMPLETED')
    expect(body.score).toBe(75)
  })

  it('returns 404 for unknown listing', async () => {
    const { prisma } = jest.requireMock('@/lib/db/prisma')
    prisma.listing.findUnique.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/listings/unknown/analyze', { method: 'POST' })
    const res = await POST(req, { params: { id: 'unknown' } })
    expect(res.status).toBe(404)
  })
})
