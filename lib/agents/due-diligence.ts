import { z } from 'zod'
import { callLLMStructured } from '@/lib/llm/client'
import type { Listing } from '@prisma/client'
import type { RightsAnalysis, LicenseCheck } from './types'

const RightsSchema = z.object({
  hasLien: z.boolean().describe('저당권/근저당권 있음'),
  hasInjunction: z.boolean().describe('가처분/가압류 있음'),
  hasLegalSurfaceRight: z.boolean().describe('법정지상권 성립 가능성 있음'),
  hasOccupancy: z.boolean().describe('임차인 점유 있음'),
  hasUnpaidRent: z.boolean().describe('미납 임대료 있음'),
  hasTaxLien: z.boolean().describe('국세/지방세 체납 있음'),
  clearanceEstimate: z.number().describe('인수해야 할 권리 추정 금액 (KRW, 없으면 0)'),
  summary: z.string().describe('권리분석 요약 (2-3문장, 한국어)'),
})

const LicenseSchema = z.object({
  eligible: z.boolean().describe('숙박업 등록 가능 여부'),
  propertyUseChangeable: z.boolean().describe('건축물 용도변경 가능 여부'),
  estimatedFee: z.number().describe('인허가 예상 비용 (KRW)'),
  obstacles: z.array(z.string()).describe('장애 요인 목록'),
  summary: z.string().describe('인허가 가능성 요약 (2-3문장, 한국어)'),
})

const RIGHTS_SYSTEM = `당신은 한국 부동산 권리분석 전문가다.
경매/공매 매물의 권리관계를 분석하여 위험 요소를 식별한다.
Phase 1에서는 주소, 물건 종류, 법원, 사건번호로 추정 분석한다.
유찰 횟수가 많을수록 권리 문제 가능성이 높다고 가정한다.
실제 등기부등본 없이 분석하므로 보수적으로 평가하라.`

const LICENSE_SYSTEM = `당신은 한국 숙박업 인허가 전문 컨설턴트다.
관광진흥법, 공중위생관리법 기준으로 숙박업 등록 가능성을 판단한다.
물건 종류(호텔/펜션/게스트하우스/모텔)에 따라 적용 법령이 다르다.
펜션: 농어촌민박사업자 신고 (연면적 230m² 미만) 또는 관광펜션
호텔: 관광호텔업 등록 (관광진흥법)
게스트하우스: 외국인관광 도시민박업 또는 공중위생관리법 숙박업
모텔: 공중위생관리법 숙박업`

export type DueDiligenceOutput = {
  rightsAnalysis: RightsAnalysis
  licenseCheck: LicenseCheck
}

export async function runDueDiligence(listing: Listing): Promise<DueDiligenceOutput> {
  const context = `
매물 정보:
- 주소: ${listing.address}
- 물건 종류: ${listing.propertyType}
- 거래 유형: ${listing.listingType}
- 면적: ${listing.area ? `${listing.area}m²` : '정보 없음'}
- 건축연도: ${listing.buildYear ?? '정보 없음'}
- 최저입찰가: ${listing.minimumBid != null ? (Number(listing.minimumBid / 100_000_000n) + Number(listing.minimumBid % 100_000_000n) / 100_000_000).toFixed(1) : '정보 없음'}억원
- 감정가: ${listing.appraisalValue != null ? (Number(listing.appraisalValue / 100_000_000n) + Number(listing.appraisalValue % 100_000_000n) / 100_000_000).toFixed(1) : '정보 없음'}억원
- 유찰 횟수: ${listing.auctionCount}회
${listing.court ? `- 관할 법원: ${listing.court}` : ''}
${listing.caseNumber ? `- 사건번호: ${listing.caseNumber}` : ''}
`.trim()

  const [rightsAnalysis, licenseCheck] = await Promise.all([
    callLLMStructured(
      `${context}\n\n위 매물의 권리관계를 분석하라.`,
      RightsSchema,
      'standard',
      RIGHTS_SYSTEM,
    ),
    callLLMStructured(
      `${context}\n\n위 매물의 숙박업 인허가 가능성을 분석하라.`,
      LicenseSchema,
      'standard',
      LICENSE_SYSTEM,
    ),
  ])

  return { rightsAnalysis, licenseCheck }
}
