import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const [total, analyzed, highScore, dropped] = await Promise.all([
    prisma.listing.count({ where: { isDropped: false } }),
    prisma.listing.count({ where: { score: { not: null }, isDropped: false } }),
    prisma.listing.count({ where: { score: { gte: 70 }, isDropped: false } }),
    prisma.listing.count({ where: { isDropped: true } }),
  ])

  const recent = await prisma.listing.findMany({
    where: { isDropped: false },
    orderBy: { collectedAt: 'desc' },
    take: 6,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '전체 매물', value: total, color: 'text-gray-900' },
          { label: '분석 완료', value: analyzed, color: 'text-blue-600' },
          { label: '고점수 (70+)', value: highScore, color: 'text-green-600' },
          { label: '제외됨', value: dropped, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">최근 수집 매물</h2>
        <Link href="/listings" className="text-sm text-blue-600 hover:underline">
          전체 보기 →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {recent.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{listing.address}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {listing.listingType === 'AUCTION' ? '경매' : listing.listingType === 'PUBLIC_SALE' ? '공매' : '숙박임차'} · {listing.propertyType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억
              </p>
              {listing.score !== null ? (
                <p className={`text-xs font-medium ${listing.score >= 70 ? 'text-green-600' : listing.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {listing.score}점
                </p>
              ) : (
                <p className="text-xs text-gray-300">미분석</p>
              )}
            </div>
          </Link>
        ))}
        {recent.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">매물이 없습니다. 시드 데이터를 실행하세요.</p>
        )}
      </div>
    </div>
  )
}
