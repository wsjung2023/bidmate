import { prisma } from '@/lib/db/prisma'
import type { Listing } from '@prisma/client'

type CollectorOptions = {
  source?: string  // 'mock' | 'onbid' | etc.
  limit?: number
}

export async function runCollector(options: CollectorOptions = {}): Promise<Listing[]> {
  const { source = 'mock', limit = 100 } = options

  // Phase 1: reads from database (populated by seed or future real API adapters)
  // Phase 2: call real APIs (온비드, 법원경매, 공매), then upsert new listings
  const listings = await prisma.listing.findMany({
    where: {
      source,
      isDropped: false,
    },
    orderBy: { collectedAt: 'desc' },
    take: limit,
  })

  return listings
}
