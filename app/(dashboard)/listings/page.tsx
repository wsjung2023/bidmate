import { prisma } from '@/lib/db/prisma'
import { ListingType, PropertyType, Prisma } from '@prisma/client'
import { ListingsFilter } from './ListingsFilter'
import { ListingCard } from '@/components/ListingCard'
import { Suspense } from 'react'
import Link from 'next/link'

const VALID_TYPES = new Set<string>(['AUCTION', 'PUBLIC_SALE', 'LODGING_LEASE'])
const VALID_PROPERTY_TYPES = new Set<string>([
  'HOTEL', 'PENSION', 'GUESTHOUSE', 'MOTEL', 'RESORT', 'BUILDING', 'LAND', 'OTHER',
])

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
  const {
    page: pageStr,
    type: typeParam,
    propertyType: propTypeParam,
    q,
    score,
    sort,
    dropped: droppedStr,
  } = await searchParams

  const page = Math.max(1, parseInt(pageStr ?? '1') || 1)
  const dropped = droppedStr === 'true'

  const type: ListingType | null =
    typeParam && VALID_TYPES.has(typeParam) ? (typeParam as ListingType) : null
  const propType: PropertyType | null =
    propTypeParam && VALID_PROPERTY_TYPES.has(propTypeParam)
      ? (propTypeParam as PropertyType)
      : null

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
    sort === 'recent'
      ? [{ collectedAt: 'desc' }]
      : sort === 'bid_asc'
        ? [{ minimumBid: 'asc' }]
        : sort === 'bid_desc'
          ? [{ minimumBid: 'desc' }]
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
        <h1 className="text-2xl font-bold text-slate-900">
          매물 목록{' '}
          <span className="text-slate-400 text-xl font-normal">({total}건)</span>
        </h1>
        <Link
          href="/map"
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          🗺️ 지도 보기
        </Link>
      </div>

      <Suspense>
        <ListingsFilter />
      </Suspense>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-400 text-sm">해당하는 매물이 없습니다</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={pageUrl(page - 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600"
            >
              이전
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageUrl(page + 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
