import { callLLM } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs } from './types'
import type { ScoreResult } from '@/lib/scoring/types'

export type ReportOutput = {
  title: string
  summary: string
  fullReport: string
  recommendedBid: number
  expectedRoi: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'PASS' | 'AVOID'
}

const SYSTEM = `당신은 부동산 투자 분석 보고서 작성 전문가다.
제공된 분석 데이터를 바탕으로 투자자가 읽기 쉬운 한국어 보고서를 작성한다.
보고서는 마크다운 형식으로 작성하며, 구체적인 수치를 포함해야 한다.`

function getRecommendation(score: number, riskLevel: string): ReportOutput['recommendation'] {
  if (riskLevel === 'CRITICAL') return 'AVOID'
  if (score >= 80 && riskLevel === 'LOW') return 'STRONG_BUY'
  if (score >= 70) return 'BUY'
  if (score >= 55) return 'NEUTRAL'
  if (score >= 40) return 'PASS'
  return 'AVOID'
}

export async function runReport(
  listing: Listing,
  outputs: AgentOutputs,
  score: ScoreResult,
): Promise<ReportOutput> {
  const { rightsAnalysis, licenseCheck, commercialArea, financials, riskFactors, strategy } = outputs

  const prompt = `
다음 부동산 투자 분석 데이터를 바탕으로 종합 투자 보고서를 작성하라.

## 매물 기본정보
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType} (${listing.listingType ?? '정보 없음'})
- 최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
- 감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
- 면적: ${listing.area ? `${listing.area}m²` : '미상'}
- 건축연도: ${listing.buildYear ?? '미상'}

## 분석 결과 요약
- 종합 점수: ${score.total}/100점
  - 권리분석: ${score.breakdown.rights}/30
  - 상권/입지: ${score.breakdown.commercial}/25
  - 수익성: ${score.breakdown.financials}/25
  - 인허가: ${score.breakdown.license}/10
  - 건물상태: ${score.breakdown.condition}/10

## 권리분석
${rightsAnalysis.summary}

## 인허가 가능성
${licenseCheck.summary}

## 상권 분석
${commercialArea.summary}
- 관광지 접근성: ${commercialArea.touristProximityScore}/100
- 평균 객실 단가: ${(commercialArea.averageDailyRate / 10000).toFixed(0)}만원/박
- 지역 평균 점유율: ${commercialArea.occupancyRateBenchmark}%

## 수익성 분석
${financials.summary}
- 월 예상 매출: ${(financials.estimatedMonthlyRevenue / 10000).toFixed(0)}만원
- 월 예상 순이익: ${(financials.estimatedMonthlyProfit / 10000).toFixed(0)}만원
- 연 ROI: ${financials.roiPercent.toFixed(1)}%
- 손익분기: ${financials.breakEvenMonths}개월

## 위험도 평가
수준: ${riskFactors.level}
${riskFactors.summary}
${riskFactors.factors.map((f) => `- ${f}`).join('\n')}

## 투자 전략
${strategy ? strategy.summary : '전략 분석 미수행'}
${strategy ? `권장 입찰가: ${(strategy.recommendedBid / 100_000_000).toFixed(1)}억원` : ''}

---

위 데이터를 바탕으로 다음 구조의 보고서를 작성하라:
1. 핵심 요약 (3-4문장)
2. 권리관계 검토
3. 인허가 가능성
4. 상권 및 입지 분석
5. 수익성 분석 (표 포함)
6. 위험 요소
7. 투자 추천 의견
8. 실행 계획

모든 내용은 한국어로 작성하고 마크다운 형식을 사용하라.
`.trim()

  try {
    const fullReport = await callLLM(prompt, 'premium', SYSTEM)

    const summary = fullReport.split('\n').filter((l) => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ')

    return {
      title: `[${score.total}점] ${listing.address} 투자 분석`,
      summary: summary.slice(0, 500),
      fullReport,
      recommendedBid: strategy?.recommendedBid ?? Number(listing.minimumBid),
      expectedRoi: financials.roiPercent,
      riskLevel: riskFactors.level,
      recommendation: getRecommendation(score.total, riskFactors.level),
    }
  } catch (err) {
    throw new Error(`Report failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
