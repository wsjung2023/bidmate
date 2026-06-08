import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const RISK_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '위험',
}
const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const RECO_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수', BUY: '매수', NEUTRAL: '중립', PASS: '보류', AVOID: '기피',
}
const RECO_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      analysis: {
        include: { listing: true },
      },
    },
  })

  if (!report) notFound()

  const listing = report.analysis.listing

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/reports" className="hover:text-gray-600">보고서 목록</Link>
        <span>›</span>
        <span className="text-gray-600 truncate">{listing.address}</span>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{report.title}</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          {report.recommendation && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${RECO_COLOR[report.recommendation]}`}>
              {RECO_LABEL[report.recommendation]}
            </span>
          )}
          {report.riskLevel && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${RISK_COLOR[report.riskLevel]}`}>
              위험도: {RISK_LABEL[report.riskLevel]}
            </span>
          )}
          {report.expectedRoi && (
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
              예상 ROI: {report.expectedRoi.toFixed(1)}%
            </span>
          )}
          {report.recommendedBid && (
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              권장 입찰가: {(Number(report.recommendedBid) / 100_000_000).toFixed(1)}억
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 mb-6 leading-relaxed">
          {report.summary}
        </p>

        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
            {report.fullReport}
          </pre>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/listings/${listing.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 매물 상세로 돌아가기
        </Link>
      </div>
    </div>
  )
}
