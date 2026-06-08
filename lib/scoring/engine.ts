import type { AgentOutputs } from '@/lib/agents/types'
import type { ScoreResult } from './types'

export function calculateScore(outputs: AgentOutputs): ScoreResult {
  const rights = scoreRights(outputs.rightsAnalysis)
  const commercial = scoreCommercial(outputs.commercialArea)
  const financials = scoreFinancials(outputs.financials)
  const license = scoreLicense(outputs.licenseCheck)
  const condition = 7 // default — building condition not yet assessed in Phase 1

  const total = Math.round(rights + commercial + financials + license + condition)

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: { rights, commercial, financials, license, condition },
  }
}

function scoreRights(r: AgentOutputs['rightsAnalysis']): number {
  let score = 30
  if (r.hasLegalSurfaceRight) score -= 25
  if (r.hasInjunction) score -= 20
  if (r.hasLien) score -= Math.min(15, 5 + (r.clearanceEstimate / 100_000_000) * 3)
  if (r.hasOccupancy) score -= 10
  if (r.hasUnpaidRent) score -= 8
  if (r.hasTaxLien) score -= 5
  return Math.max(0, score)
}

function scoreCommercial(c: AgentOutputs['commercialArea']): number {
  const proximity = (c.touristProximityScore / 100) * 17
  const occupancy = c.occupancyRateBenchmark >= 80 ? 8 : c.occupancyRateBenchmark >= 60 ? 5 : 2
  const competitorPenalty =
    c.competitorCount <= 2 ? 0 : c.competitorCount <= 5 ? 1 : c.competitorCount <= 10 ? 2 : 5

  return Math.max(0, Math.min(25, proximity + occupancy - competitorPenalty))
}

function scoreFinancials(f: AgentOutputs['financials']): number {
  const roiScore =
    f.roiPercent >= 15 ? 20
    : f.roiPercent >= 10 ? 15
    : f.roiPercent >= 7 ? 10
    : f.roiPercent >= 5 ? 5
    : 0

  const breakEvenScore = f.breakEvenMonths < 60 ? 5 : f.breakEvenMonths <= 120 ? 3 : 0

  return Math.min(25, roiScore + breakEvenScore)
}

function scoreLicense(l: AgentOutputs['licenseCheck']): number {
  if (!l.eligible) return 0
  if (!l.propertyUseChangeable) return 3
  const obstaclesPenalty = Math.min(6, l.obstacles.length * 2)
  return Math.max(0, 10 - obstaclesPenalty)
}
