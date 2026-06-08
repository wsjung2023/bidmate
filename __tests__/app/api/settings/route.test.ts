/**
 * @jest-environment node
 */
import { GET, PUT } from '@/app/api/settings/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    investmentCriteria: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({
        id: 'crit-1',
        userId: 'user-1',
        minScore: 65,
        regions: ['강원도', '제주도'],
        propertyTypes: ['PENSION', 'GUESTHOUSE'],
        listingTypes: ['AUCTION'],
        telegramChatId: null,
        notifyEnabled: false,
      }),
    },
  },
}))

describe('GET /api/settings', () => {
  it('returns null criteria when none exist', async () => {
    const req = new NextRequest('http://localhost/api/settings')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.criteria).toBeNull()
  })
})

describe('PUT /api/settings', () => {
  it('saves criteria and returns result', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ minScore: 65, regions: ['강원도', '제주도'], propertyTypes: ['PENSION'], listingTypes: ['AUCTION'] }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await PUT(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.criteria.minScore).toBe(65)
  })
})
