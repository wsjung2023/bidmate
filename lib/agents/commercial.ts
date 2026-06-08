import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { CommercialArea } from './types'

const CommercialSchema = z.object({
  touristProximityScore: z.number().min(0).max(100).describe('관광지 접근성 점수 (0-100)'),
  competitorCount: z.number().int().min(0).describe('반경 2km 내 유사 숙박업체 추정 수'),
  occupancyRateBenchmark: z.number().min(0).max(100).describe('동일 지역 숙박업 평균 점유율 (%)'),
  averageDailyRate: z.number().min(0).describe('동일 등급 객실 평균 1박 요금 (KRW)'),
  summary: z.string().describe('상권 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 한국 숙박업 상권 분석 전문가다.
소상공인시장진흥공단 상권정보 및 관광지 데이터를 기반으로 분석한다.
Phase 1에서는 주소와 물건 종류로 추정 분석한다.
계절성(스키/여름 해수욕 등)을 반드시 고려하라.`

export async function runCommercial(listing: Listing): Promise<CommercialArea> {
  const prompt = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}

이 위치의 숙박업 상권을 분석하라. 관광지 접근성, 경쟁 현황, 시장 벤치마크를 포함하라.
`.trim()

  try {
    return await callLLMStructured(prompt, CommercialSchema, 'standard', SYSTEM)
  } catch (err) {
    throw new Error(`Commercial failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
