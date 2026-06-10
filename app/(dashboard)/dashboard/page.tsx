import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { ListingCard } from '@/components/ListingCard'

export default async function DashboardPage() {
  const [total, analyzed, highScore, dropped, recentCollected] = await Promise.all([
    prisma.listing.count({ where: { isDropped: false } }),
    prisma.listing.count({ where: { score: { not: null }, isDropped: false } }),
    prisma.listing.count({ where: { score: { gte: 70 }, isDropped: false } }),
    prisma.listing.count({ where: { isDropped: true } }),
    prisma.listing.count({
      where: {
        isDropped: false,
        collectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const recent = await prisma.listing.findMany({
    where: { isDropped: false },
    orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { collectedAt: 'desc' }],
    take: 8,
  })

  const STATS = [
    {
      label: '전체 매물',
      value: total,
      sub: `오늘 +${recentCollected}건`,
      color: 'text-slate-900',
      bg: 'bg-slate-50',
      icon: '🏠',
    },
    {
      label: '분석 완료',
      value: analyzed,
      sub: `${total > 0 ? Math.round((analyzed / total) * 100) : 0}% 완료`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      icon: '🤖',
    },
    {
      label: '고점수 매물',
      value: highScore,
      sub: '70점 이상',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: '⭐',
    },
    {
      label: '분석 제외',
      value: dropped,
      sub: '조건 미달',
      color: 'text-slate-400',
      bg: 'bg-slate-50',
      icon: '🚫',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-500 mt-0.5">숙박업 경매 매물 AI 분석 현황</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/map"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors"
          >
            🗺️ 지도 보기
          </Link>
          <Link
            href="/listings"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            📋 전체 목록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, sub, color, bg, icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-slate-200`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <span className="text-lg">{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${color} leading-none`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">추천 매물</h2>
        <Link
          href="/listings"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          전체 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recent.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {recent.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-slate-400 text-sm">매물이 없습니다. 수집을 먼저 실행하세요.</p>
        </div>
      )}
    </div>
  )
}
