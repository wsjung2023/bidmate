/**
 * @jest-environment node
 */
import { GET } from '@/app/api/reports/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    report: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'report-1',
          title: '[78점] 강원도 평창군 투자 분석',
          summary: '우수한 투자 매물',
          recommendation: 'BUY',
          expectedRoi: 14.1,
          riskLevel: 'LOW',
          createdAt: new Date(),
          analysis: { listing: { id: 'listing-1', address: '강원도 평창군' } },
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
  },
}))

describe('GET /api/reports', () => {
  it('returns reports with total', async () => {
    const req = new NextRequest('http://localhost/api/reports')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.reports).toHaveLength(1)
    expect(body.total).toBe(1)
  })
})
