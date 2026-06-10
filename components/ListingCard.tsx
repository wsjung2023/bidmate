import Link from 'next/link'
import type { Listing } from '@prisma/client'
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL, PROPERTY_ICONS } from '@/lib/labels'
import { ScoreBadge } from '@/components/ui/ScoreBadge'

export function ListingCard({ listing }: { listing: Listing }) {
  const icon = PROPERTY_ICONS[listing.propertyType] ?? '📍'
  const priceEok = (Number(listing.minimumBid) / 1e8).toFixed(1)
  const appraisalEok = (Number(listing.appraisalValue) / 1e8).toFixed(1)
  const discount = Math.round(
    ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100,
  )

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
    >
      {/* Header: 아이콘 + 태그 + 점수 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{icon}</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            <span className="text-xs text-slate-500">
              {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}
            </span>
          </div>
        </div>
        <ScoreBadge score={listing.score} />
      </div>

      {/* 주소 */}
      <p className="text-sm font-semibold text-slate-800 mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">
        {listing.address}
      </p>

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
        {listing.area && (
          <span>{listing.area.toFixed(0)}m² ({(listing.area / 3.306).toFixed(0)}평)</span>
        )}
        {listing.auctionDate && (
          <span>
            경매{' '}
            {listing.auctionDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          </span>
        )}
        {listing.auctionCount > 0 && (
          <span className="text-orange-500 font-medium">{listing.auctionCount}회 유찰</span>
        )}
        {listing.court && <span>{listing.court}</span>}
      </div>

      {/* 가격 행 */}
      <div className="flex items-end justify-between pt-3 border-t border-slate-100">
        <div>
          <p className="text-xl font-bold text-slate-900 leading-none">{priceEok}억</p>
          <p className="text-xs text-slate-400 mt-1">감정가 {appraisalEok}억</p>
        </div>
        {discount > 0 && (
          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            {discount}% 할인
          </span>
        )}
      </div>
    </Link>
  )
}
