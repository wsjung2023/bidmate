import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs, RiskFactors } from './types'

const RiskSchema = z.object({
  level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('전체 위험 수준'),
  factors: z.array(z.string()).describe('위험 요인 목록 (한국어, 각 1문장)'),
  summary: z.string().describe('위험 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 부동산 투자 리스크 분석 전문가다.
권리분석, 인허가, 상권, 수익성 데이터를 종합하여 투자 위험을 평가한다.
위험 수준: LOW(양호), MEDIUM(주의), HIGH(위험), CRITICAL(투자 불가)`

export async function runRisk(
  listing: Listing,
  outputs: Omit<AgentOutputs, 'riskFactors' | 'strategy'>,
): Promise<RiskFactors> {
  const prompt = `
매물: ${listing.address} (${listing.propertyType}, ${listing.listingType})
건축연도: ${listing.buildYear ?? '미상'}, 유찰: ${listing.auctionCount}회

[권리분석]
- 저당권: ${outputs.rightsAnalysis.hasLien}
- 가처분: ${outputs.rightsAnalysis.hasInjunction}
- 법정지상권: ${outputs.rightsAnalysis.hasLegalSurfaceRight}
- 점유: ${outputs.rightsAnalysis.hasOccupancy}
- 인수 금액 추정: ${(outputs.rightsAnalysis.clearanceEstimate / 10000).toFixed(0)}만원

[인허가]
- 가능 여부: ${outputs.licenseCheck.eligible}
- 장애 요인: ${outputs.licenseCheck.obstacles.join(', ') || '없음'}

[상권]
- 관광지 접근성: ${outputs.commercialArea.touristProximityScore}/100
- 경쟁업체 수: ${outputs.commercialArea.competitorCount}개

[수익성]
- 연 ROI: ${outputs.financials.roiPercent.toFixed(1)}%
- 손익분기: ${outputs.financials.breakEvenMonths}개월

위 정보를 종합하여 투자 리스크를 평가하라.
`.trim()

  try {
    return await callLLMStructured(prompt, RiskSchema, 'standard', SYSTEM)
  } catch (err) {
    throw new Error(`Risk failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
