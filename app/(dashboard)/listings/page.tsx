import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import type { ListingType } from '@prisma/client'

const TYPE_LABEL: Record<string, string> = {
  AUCTION: '경매',
  PUBLIC_SALE: '공매',
  LODGING_LEASE: '숙박임차',
}
const PROPERTY_LABEL: Record<string, string> = {
  HOTEL: '호텔',
  PENSION: '펜션',
  GUESTHOUSE: '게스트하우스',
  MOTEL: '모텔',
  RESORT: '리조트',
  BUILDING: '건물',
  LAND: '토지',
  OTHER: '기타',
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; dropped?: string }>
}) {
  const { page: pageStr, type, dropped: droppedStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const dropped = droppedStr === 'true'

  const where = {
    isDropped: dropped,
    ...(type && { listingType: type as ListingType }),
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [{ score: 'desc' }, { collectedAt: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.listing.count({ where }),
  ])

  const typeFilters = [
    { key: '', label: '전체' },
    { key: 'AUCTION', label: '경매' },
    { key: 'PUBLIC_SALE', label: '공매' },
    { key: 'LODGING_LEASE', label: '숙박임차' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          매물 목록 <span className="text-gray-400 text-xl font-normal">({total}건)</span>
        </h1>
        <div className="flex gap-2">
          {typeFilters.map(({ key, label }) => (
            <Link
              key={key}
              href={`/listings${key ? `?type=${key}` : ''}`}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                (type ?? '') === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  {TYPE_LABEL[listing.listingType] ?? listing.listingType}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {PROPERTY_LABEL[listing.propertyType] ?? listing.propertyType}
                </span>
                {listing.auctionCount > 0 && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">
                    {listing.auctionCount}회 유찰
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{listing.address}</p>
              <div className="flex items-center gap-3 mt-1">
                {listing.area && (
                  <span className="text-xs text-gray-400">{listing.area.toFixed(0)}m²</span>
                )}
                {listing.auctionDate && (
                  <span className="text-xs text-gray-400">
                    경매일 {listing.auctionDate.toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">
                {(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억
              </p>
              <p className="text-xs text-gray-400">
                감정 {(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억
              </p>
              {listing.score !== null ? (
                <p className={`text-xs font-semibold mt-1 ${listing.score >= 70 ? 'text-green-600' : listing.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {listing.score}점
                </p>
              ) : (
                <p className="text-xs text-gray-300 mt-1">미분석</p>
              )}
            </div>
          </Link>
        ))}
        {listings.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">해당하는 매물이 없습니다.</p>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/listings?page=${page - 1}${type ? `&type=${type}` : ''}`}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              이전
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          {page < Math.ceil(total / 20) && (
            <Link
              href={`/listings?page=${page + 1}${type ? `&type=${type}` : ''}`}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
