import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { ListingType, PropertyType, Prisma } from '@prisma/client'
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/labels'
import { ListingsFilter } from './ListingsFilter'
import { Suspense } from 'react'

const VALID_TYPES = new Set<string>(['AUCTION', 'PUBLIC_SALE', 'LODGING_LEASE'])
const VALID_PROPERTY_TYPES = new Set<string>(['HOTEL', 'PENSION', 'GUESTHOUSE', 'MOTEL', 'RESORT', 'BUILDING', 'LAND', 'OTHER'])

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    type?: string
    propertyType?: string
    q?: string
    score?: string
    sort?: string
    dropped?: string
  }>
}) {
  const { page: pageStr, type: typeParam, propertyType: propTypeParam, q, score, sort, dropped: droppedStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1') || 1)
  const dropped = droppedStr === 'true'

  const type: ListingType | null = typeParam && VALID_TYPES.has(typeParam) ? (typeParam as ListingType) : null
  const propType: PropertyType | null = propTypeParam && VALID_PROPERTY_TYPES.has(propTypeParam) ? (propTypeParam as PropertyType) : null

  const where: Prisma.ListingWhereInput = {
    isDropped: dropped,
    ...(type && { listingType: type }),
    ...(propType && { propertyType: propType }),
    ...(q && { address: { contains: q, mode: 'insensitive' } }),
    ...(score === 'analyzed' && { score: { not: null } }),
    ...(score === 'high' && { score: { gte: 70 } }),
    ...(score === 'mid' && { score: { gte: 50, lt: 70 } }),
    ...(score === 'low' && { score: { lt: 50, not: null } }),
    ...(score === 'none' && { score: null }),
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === 'recent' ? [{ collectedAt: 'desc' }]
    : sort === 'bid_asc' ? [{ minimumBid: 'asc' }]
    : sort === 'bid_desc' ? [{ minimumBid: 'desc' }]
    : sort === 'discount' ? [{ minimumBid: 'asc' }]
    : [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }]

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({ where, orderBy, skip: (page - 1) * 20, take: 20 }),
    prisma.listing.count({ where }),
  ])

  const totalPages = Math.ceil(total / 20)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (typeParam) params.set('type', typeParam)
    if (propTypeParam) params.set('propertyType', propTypeParam)
    if (q) params.set('q', q)
    if (score) params.set('score', score)
    if (sort) params.set('sort', sort)
    if (droppedStr) params.set('dropped', droppedStr)
    const s = params.toString()
    return `/listings${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          매물 목록 <span className="text-gray-400 text-xl font-normal">({total}건)</span>
        </h1>
      </div>

      <Suspense>
        <ListingsFilter />
      </Suspense>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {listings.map((listing) => {
          const discountRate = Math.round(
            ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100
          )
          return (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                    {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
                  </span>
                  {listing.auctionCount > 0 && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">
                      {listing.auctionCount}회 유찰
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{listing.address}</p>
                <div className="flex items-center gap-3 mt-1">
                  {listing.area && (
                    <span className="text-xs text-gray-500">{listing.area.toFixed(0)}m² ({(listing.area / 3.306).toFixed(0)}평)</span>
                  )}
                  {listing.auctionDate && (
                    <span className="text-xs text-gray-500">
                      경매 {listing.auctionDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                  )}
                  {listing.court && (
                    <span className="text-xs text-gray-500">{listing.court}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">
                  {(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억
                </p>
                <p className="text-xs text-gray-500">
                  감정 {(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억
                </p>
                {discountRate > 0 && (
                  <p className="text-xs text-blue-600 font-medium">{discountRate}% 할인</p>
                )}
                {listing.score !== null ? (
                  <p className={`text-xs font-bold mt-0.5 ${listing.score >= 70 ? 'text-green-600' : listing.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {listing.score}점
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">미분석</p>
                )}
              </div>
            </Link>
          )
        })}
        {listings.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">해당하는 매물이 없습니다.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              이전
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {totalPages} 페이지
          </span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
