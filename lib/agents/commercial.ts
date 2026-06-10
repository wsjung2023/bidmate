import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { CommercialArea } from './types'
import { searchNearbyLodging, searchNearbyAttractions } from '@/lib/collectors/kakao-local'

const CommercialSchema = z.object({
  touristProximityScore: z.number().min(0).max(100).describe('관광지 접근성 점수 (0-100)'),
  competitorCount: z.number().int().min(0).describe('반경 2km 내 유사 숙박업체 수'),
  occupancyRateBenchmark: z.number().min(0).max(100).describe('동일 지역 숙박업 평균 점유율 (%)'),
  averageDailyRate: z.number().min(0).describe('동일 등급 객실 평균 1박 요금 (KRW)'),
  summary: z.string().describe('상권 분석 요약 (2-3문장, 한국어)'),
})

const SYSTEM = `당신은 한국 숙박업 상권 분석 전문가다.
제공된 주변 실제 데이터(카카오맵 기반)를 최우선으로 활용하라.
카카오 데이터가 없을 경우 주소와 물건 종류로 추정 분석한다.
계절성(스키/여름 해수욕 등)과 지역 특성을 반드시 고려하라.`

export async function runCommercial(listing: Listing): Promise<CommercialArea> {
  let kakaoContext = ''
  if (listing.latitude != null && listing.longitude != null) {
    const [lodging, attractions] = await Promise.all([
      searchNearbyLodging({ lat: listing.latitude, lng: listing.longitude, radiusM: 2000 }),
      searchNearbyAttractions({ lat: listing.latitude, lng: listing.longitude, radiusM: 5000 }),
    ])

    if (lodging != null) {
      kakaoContext += `\n[카카오맵 실측 데이터]`
      kakaoContext += `\n- 반경 2km 내 숙박업체: ${lodging.count}개`
      if (lodging.places.length > 0) {
        kakaoContext += `\n  주요 경쟁업체: ${lodging.places.slice(0, 5).map((p) => p.name).join(', ')}`
      }
    }
    if (attractions != null) {
      kakaoContext += `\n- 반경 5km 내 관광명소: ${attractions.count}개`
      if (attractions.places.length > 0) {
        kakaoContext += `\n  주요 관광지: ${attractions.places.slice(0, 5).map((p) => p.name).join(', ')}`
      }
    }
  }

  const prompt = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
${kakaoContext || '\n[좌표 없음 — 주소 기반 추정]'}

이 위치의 숙박업 상권을 분석하라. 관광지 접근성 점수(0-100), 경쟁업체 수, 시장 점유율, ADR을 포함하라.
`.trim()

  try {
    return await callLLMStructured(prompt, CommercialSchema, 'standard', SYSTEM)
  } catch (err) {
    throw new Error(`Commercial failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
