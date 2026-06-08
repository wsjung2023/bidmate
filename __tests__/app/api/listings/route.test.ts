/**
 * @jest-environment node
 */
// Set env vars before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AUTH_SECRET = 'test-secret-32-chars-minimum-length'
process.env.AUTH_GOOGLE_ID = 'test-google-id'
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'test-1',
          address: '강원도 평창군',
          minimumBid: BigInt(595_000_000),
          appraisalValue: BigInt(850_000_000),
          listingType: 'AUCTION',
          propertyType: 'PENSION',
          score: null,
          isDropped: false,
          collectedAt: new Date(),
          analyses: [],
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
  },
}))

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } }),
  signOut: jest.fn(),
  signIn: jest.fn(),
  handlers: { GET: jest.fn(), POST: jest.fn() },
}))

const { GET } = require('@/app/api/listings/route')
const { NextRequest } = require('next/server')

describe('GET /api/listings', () => {
  it('returns 200 with listings and total', async () => {
    const req = new NextRequest('http://localhost/api/listings')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.listings).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(typeof body.listings[0].minimumBid).toBe('string')
    expect(typeof body.listings[0].appraisalValue).toBe('string')
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = jest.requireMock('@/lib/auth/config')
    auth.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost/api/listings')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})
