import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RECOMMENDATION_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        analysis: {
          include: {
            listing: { select: { id: true, address: true, propertyType: true } },
          },
        },
      },
    }),
    prisma.report.count(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        분석 보고서 <span className="text-gray-400 text-xl font-normal">({total}건)</span>
      </h1>

      <div className="bg-white rounded-xl border divide-y">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-gray-900 mb-1">{report.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{report.summary.slice(0, 120)}</p>
              <p className="text-xs text-gray-300 mt-2">
                {report.createdAt.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {report.recommendation && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${RECOMMENDATION_COLOR[report.recommendation]}`}>
                  {RECOMMENDATION_LABEL[report.recommendation]}
                </span>
              )}
              {report.expectedRoi && (
                <span className="text-xs text-green-600 font-medium">ROI {report.expectedRoi.toFixed(1)}%</span>
              )}
            </div>
          </Link>
        ))}

        {reports.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-3">아직 분석된 매물이 없습니다.</p>
            <Link href="/listings" className="text-blue-600 text-sm hover:underline">
              매물 목록에서 AI 분석을 시작하세요 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
