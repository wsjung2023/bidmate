import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import type { ListingType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const type = searchParams.get('type') as ListingType | null
  const dropped = searchParams.get('dropped') === 'true'

  const where = {
    isDropped: dropped,
    ...(type && { listingType: type }),
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [{ score: 'desc' }, { collectedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        analyses: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { report: true },
        },
      },
    }),
    prisma.listing.count({ where }),
  ])

  // Serialize BigInt fields to strings for JSON compatibility
  const serialized = listings.map((listing) => ({
    ...listing,
    minimumBid: listing.minimumBid.toString(),
    appraisalValue: listing.appraisalValue.toString(),
  }))

  return NextResponse.json({ listings: serialized, total, page, limit })
}
