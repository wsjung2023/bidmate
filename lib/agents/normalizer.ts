import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { ModelPreset } from '@/lib/llm/presets'

const NormalizerOutputSchema = z.object({
  propertyDescription: z.string().describe('1-2 문장 한국어 물건 요약'),
  estimatedRenovationCost: z.number().describe('예상 리모델링 비용 (KRW, 0이면 불필요)'),
  notes: z.string().describe('특이사항 또는 주의사항'),
})

export type NormalizerOutput = z.infer<typeof NormalizerOutputSchema> & {
  listingId: string
}

export async function runNormalizer(listing: Listing, preset?: ModelPreset): Promise<NormalizerOutput> {
  const prompt = `
다음 경매/공매 매물을 분석하여 구조화된 정보를 추출하라.

매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
- 건축연도: ${listing.buildYear ?? '정보 없음'}
- 층수: ${listing.floorInfo ?? '정보 없음'}
- 최저입찰가: ${listing.minimumBid != null ? (Number(listing.minimumBid / 100_000_000n) + Number(listing.minimumBid % 100_000_000n) / 100_000_000).toFixed(1) : '정보 없음'}억원
- 감정가: ${listing.appraisalValue != null ? (Number(listing.appraisalValue / 100_000_000n) + Number(listing.appraisalValue % 100_000_000n) / 100_000_000).toFixed(1) : '정보 없음'}억원
- 유찰 횟수: ${listing.auctionCount}회

위 정보를 바탕으로:
1. 물건 특성 요약 (숙박업 관점에서)
2. 예상 리모델링 비용 (KRW, 건축연도/면적 기준 추정)
3. 특이사항 또는 주의사항
`.trim()

  try {
    const output = await callLLMStructured(prompt, NormalizerOutputSchema, 'fast', undefined, preset)
    return {
      listingId: listing.id,
      ...output,
    }
  } catch (err) {
    throw new Error(`Normalizer failed for listing ${listing.id}: ${(err as Error).message}`)
  }
}
