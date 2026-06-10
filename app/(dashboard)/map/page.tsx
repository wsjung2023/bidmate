import { prisma } from '@/lib/db/prisma'
import { MapView } from './MapView'

export default async function MapPage() {
  const listings = await prisma.listing.findMany({
    where: { isDropped: false },
    select: {
      id: true,
      address: true,
      propertyType: true,
      listingType: true,
      minimumBid: true,
      appraisalValue: true,
      area: true,
      auctionDate: true,
      auctionCount: true,
      court: true,
      latitude: true,
      longitude: true,
      score: true,
    },
    orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }],
    take: 500,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          지도 보기{' '}
          <span className="text-slate-400 text-xl font-normal">({listings.length}건)</span>
        </h1>
      </div>
      <MapView listings={listings as any} />
    </div>
  )
}
