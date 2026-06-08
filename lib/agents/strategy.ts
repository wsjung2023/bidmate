import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { AgentOutputs, Strategy } from './types'

const StrategySchema = z.object({
  recommendedBid: z.number().describe('권장 입찰가 (KRW)'),
  operatingModel: z.string().describe('권장 운영 모델 (예: 직접 운영, 위탁 운영, 임대)'),
  keyActions: z.array(z.string()).describe('핵심 실행 과제 목록 (한국어, 각 1문장, 3-5개)'),
  summary: z.string().describe('전략 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 부동산 투자 전략 컨설턴트다.
분석된 데이터를 바탕으로 최적의 입찰 전략과 운영 계획을 제시한다.
입찰가는 수익성과 경쟁 상황을 고려하여 감정가 대비 비율로 제시한다.`

export async function runStrategy(listing: Listing, outputs: AgentOutputs): Promise<Strategy> {
  const prompt = `
매물: ${listing.address} (${listing.propertyType})
최저입찰가: ${(Number(listing.minimumBid) / 100_000_000).toFixed(1)}억원
감정가: ${(Number(listing.appraisalValue) / 100_000_000).toFixed(1)}억원
유찰 횟수: ${listing.auctionCount}회

[분석 요약]
- 권리분석: ${outputs.rightsAnalysis.summary}
- 인허가: ${outputs.licenseCheck.summary}
- 상권: ${outputs.commercialArea.summary}
- 수익성: ${outputs.financials.summary}
- 위험도: ${outputs.riskFactors.level} — ${outputs.riskFactors.summary}

위 분석을 바탕으로 최적의 입찰 전략과 운영 계획을 수립하라.
`.trim()

  try {
    return await callLLMStructured(prompt, StrategySchema, 'standard', SYSTEM)
  } catch (err) {
    throw new Error(`Strategy failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
