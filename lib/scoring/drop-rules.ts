import type { AgentOutputs } from '@/lib/agents/types'

export type DropResult = { drop: false; reason?: undefined } | { drop: true; reason: string }

export function checkDropRules(
  outputs: AgentOutputs,
  minimumBid: number,
  appraisalValue: number,
): DropResult {
  const { rightsAnalysis, licenseCheck, financials } = outputs

  if (rightsAnalysis.hasLegalSurfaceRight) {
    return { drop: true, reason: '법정지상권 성립 가능 — 소유권 취득 후에도 제3자 사용권 존재' }
  }

  if (rightsAnalysis.hasInjunction) {
    return { drop: true, reason: '가처분 등기 있음 — 소유권 이전 후 취소될 위험' }
  }

  if (!licenseCheck.eligible) {
    return { drop: true, reason: '숙박업 인허가 불가 — 용도변경 또는 법적 요건 미충족' }
  }

  if (financials.roiPercent < 5) {
    return {
      drop: true,
      reason: `ROI ${financials.roiPercent.toFixed(1)}% — 최소 기준(5%) 미달`,
    }
  }

  if (appraisalValue > 0 && minimumBid / appraisalValue > 1.2) {
    const ratio = ((minimumBid / appraisalValue) * 100).toFixed(1)
    return {
      drop: true,
      reason: `입찰가가 감정가의 ${ratio}% — 120% 초과 시 수익성 없음`,
    }
  }

  return { drop: false }
}
