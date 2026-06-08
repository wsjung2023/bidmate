import type { CommercialArea, Financials } from './types'

type FinancialsInput = {
  minimumBid: number
  area: number
  commercialArea: CommercialArea
  estimatedRenovationCost: number
}

export function calculateFinancials(input: FinancialsInput): Financials {
  const { minimumBid, area, commercialArea, estimatedRenovationCost } = input

  // Revenue: rooms × ADR × occupancy × days
  // Rough room count: area / 30m² per room
  const estimatedRooms = Math.max(1, Math.floor(area / 30))
  const occupancyDecimal = commercialArea.occupancyRateBenchmark / 100
  const estimatedMonthlyRevenue = Math.round(
    estimatedRooms * commercialArea.averageDailyRate * occupancyDecimal * 30
  )

  // Costs: 40% of revenue + fixed costs
  const variableCosts = estimatedMonthlyRevenue * 0.4
  const fixedCosts = 1_500_000 + (area * 5000) // utilities + maintenance
  const estimatedMonthlyCost = Math.round(variableCosts + fixedCosts)

  const estimatedMonthlyProfit = estimatedMonthlyRevenue - estimatedMonthlyCost

  // Annual ROI = annual profit / total investment
  const totalInvestment = minimumBid + estimatedRenovationCost
  const roiPercent =
    totalInvestment > 0
      ? Math.round((estimatedMonthlyProfit * 12 / totalInvestment) * 1000) / 10
      : 0

  const breakEvenMonths =
    estimatedMonthlyProfit > 0
      ? Math.ceil(totalInvestment / estimatedMonthlyProfit)
      : 999

  const summary = `월 예상 매출 ${(estimatedMonthlyRevenue / 10000).toFixed(0)}만원, ` +
    `월 예상 순이익 ${(estimatedMonthlyProfit / 10000).toFixed(0)}만원, ` +
    `연 ROI ${roiPercent.toFixed(1)}%, 손익분기 ${breakEvenMonths}개월`

  return {
    estimatedMonthlyRevenue,
    estimatedMonthlyCost,
    estimatedMonthlyProfit,
    roiPercent,
    breakEvenMonths,
    summary,
  }
}
