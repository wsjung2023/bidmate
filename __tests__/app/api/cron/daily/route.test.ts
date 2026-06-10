/**
 * @jest-environment node
 */
process.env.CRON_SECRET = 'test-secret'

import { GET } from '@/app/api/cron/daily/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    listing: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    pipelineRun: {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    investmentCriteria: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

jest.mock('@/lib/pipeline/orchestrator', () => ({
  runPipeline: jest.fn(),
}))

jest.mock('@/lib/notifications/telegram', () => ({
  sendTelegramMessage: jest.fn(),
  formatListingAlert: jest.fn().mockReturnValue('alert text'),
}))

jest.mock('@/lib/collectors/court-auction', () => ({
  collectCourtAuction: jest.fn().mockResolvedValue({ collected: 0, skipped: 0, errors: 0 }),
}))

describe('GET /api/cron/daily', () => {
  it('returns 401 without correct secret', async () => {
    const req = new NextRequest('http://localhost/api/cron/daily', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct secret', async () => {
    const req = new NextRequest('http://localhost/api/cron/daily', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBeDefined()
  })
})
