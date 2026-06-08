export type ScoreBreakdown = {
  rights: number    // max 30 — 권리분석
  commercial: number // max 25 — 입지/상권
  financials: number // max 25 — 수익성
  license: number    // max 10 — 인허가
  condition: number  // max 10 — 건물상태
}

export type ScoreResult = {
  total: number
  breakdown: ScoreBreakdown
}
