import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        analysis: {
          include: {
            listing: {
              select: { id: true, address: true, propertyType: true, listingType: true },
            },
          },
        },
      },
    }),
    prisma.report.count(),
  ])

  return NextResponse.json({ reports, total, page })
}
