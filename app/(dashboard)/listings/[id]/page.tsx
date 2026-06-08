import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import { LISTING_TYPE_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/labels'

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await prisma.listing.findUnique({ where: { id } })
  if (!listing) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.address}</h1>
      <p className="text-gray-500 mb-6">{LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType} · {PROPERTY_TYPE_LABEL[listing.propertyType] ?? listing.propertyType}</p>
      <div className="bg-white rounded-xl border p-6">
        <p className="text-sm text-gray-500">분석 기능은 Phase 1B에서 구현됩니다.</p>
        <p className="mt-2">최저입찰가: <strong>{(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억</strong></p>
        <p className="mt-1">감정가: <strong>{(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억</strong></p>
        {listing.area && <p className="mt-1">면적: <strong>{listing.area.toFixed(0)}m²</strong></p>}
        {listing.caseNumber && <p className="mt-1">사건번호: <strong>{listing.caseNumber}</strong></p>}
      </div>
    </div>
  )
}
