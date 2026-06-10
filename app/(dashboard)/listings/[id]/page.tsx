import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AnalyzeButton } from './AnalyzeButton'

const TYPE_LABEL: Record<string, string> = {
  AUCTION: '경매', PUBLIC_SALE: '공매', LODGING_LEASE: '숙박임차',
}
const PROPERTY_LABEL: Record<string, string> = {
  HOTEL: '호텔', PENSION: '펜션', GUESTHOUSE: '게스트하우스',
  MOTEL: '모텔', RESORT: '리조트', BUILDING: '건물', LAND: '토지', OTHER: '기타',
}
const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RISK_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '위험',
}
const RISK_COLOR: Record<string, string> = {
  LOW: 'text-green-600', MEDIUM: 'text-yellow-600', HIGH: 'text-orange-600', CRITICAL: 'text-red-600',
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { report: true },
      },
    },
  })

  if (!listing) notFound()

  const latestAnalysis = listing.analyses[0]
  const report = latestAnalysis?.report

  const discountRate = Math.round(
    ((Number(listing.appraisalValue) - Number(listing.minimumBid)) / Number(listing.appraisalValue)) * 100
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/listings" className="hover:text-gray-600">매물 목록</Link>
        <span>›</span>
        <span className="text-gray-600">{listing.address}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
              {TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {PROPERTY_LABEL[listing.propertyType] ?? listing.propertyType}
            </span>
            {listing.isDropped && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">분석 제외</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{listing.address}</h1>
          {listing.addressDetail && <p className="text-gray-500 mt-1">{listing.addressDetail}</p>}
        </div>

        {!listing.isDropped && (
          <AnalyzeButton listingId={listing.id} hasAnalysis={!!latestAnalysis} />
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">최저입찰가</p>
          <p className="text-xl font-bold text-gray-900">
            {(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400 mb-1">감정가</p>
          <p className="text-xl font-bold text-gray-500">
            {(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억
          </p>
          <p className="text-xs text-blue-600 mt-1">낙찰가율 {100 - discountRate}%</p>
        </div>
        {listing.area && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">면적</p>
            <p className="text-xl font-bold text-gray-900">{listing.area.toFixed(0)}m²</p>
            <p className="text-xs text-gray-400 mt-1">{(listing.area / 3.306).toFixed(0)}평</p>
          </div>
        )}
        {listing.score !== null && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">종합 점수</p>
            <p className={`text-xl font-bold ${listing.score >= 70 ? 'text-green-600' : listing.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
              {listing.score}점
            </p>
          </div>
        )}
      </div>

      {/* Property details */}
      <div className="bg-white rounded-xl border p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">물건 정보</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {listing.buildYear && (
            <>
              <dt className="text-gray-600 font-medium">건축연도</dt>
              <dd className="text-gray-900">{listing.buildYear}년 ({new Date().getFullYear() - listing.buildYear}년 경과)</dd>
            </>
          )}
          {listing.floorInfo && (
            <>
              <dt className="text-gray-600 font-medium">층수</dt>
              <dd className="text-gray-900">{listing.floorInfo}</dd>
            </>
          )}
          {listing.auctionDate && (
            <>
              <dt className="text-gray-600 font-medium">경매 일정</dt>
              <dd className="text-gray-900">
                {listing.auctionDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                {listing.auctionCount > 0 && ` (${listing.auctionCount}회 유찰)`}
              </dd>
            </>
          )}
          {listing.court && (
            <>
              <dt className="text-gray-600 font-medium">관할 법원</dt>
              <dd className="text-gray-900">{listing.court}</dd>
            </>
          )}
          {listing.caseNumber && (
            <>
              <dt className="text-gray-600 font-medium">사건번호</dt>
              <dd className="font-mono text-gray-900">{listing.caseNumber}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Analysis results */}
      {latestAnalysis?.status === 'COMPLETED' && report && (
        <div className="bg-white rounded-xl border p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">분석 결과</h2>
            <Link href={`/reports/${report.id}`} className="text-sm text-blue-600 hover:underline">
              전체 보고서 보기 →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {report.recommendation && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">투자 의견</p>
                <p className="font-bold text-gray-900">{RECOMMENDATION_LABEL[report.recommendation] ?? report.recommendation}</p>
              </div>
            )}
            {report.expectedRoi && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">예상 ROI</p>
                <p className="font-bold text-green-600">{report.expectedRoi.toFixed(1)}%</p>
              </div>
            )}
            {report.riskLevel && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">위험도</p>
                <p className={`font-bold ${RISK_COLOR[report.riskLevel]}`}>{RISK_LABEL[report.riskLevel] ?? report.riskLevel}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">{report.summary.slice(0, 300)}{report.summary.length > 300 ? '...' : ''}</p>
        </div>
      )}

      {listing.isDropped && listing.droppedReason && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">분석 제외 사유</h2>
          <p className="text-sm text-red-600">{listing.droppedReason}</p>
        </div>
      )}
    </div>
  )
}
