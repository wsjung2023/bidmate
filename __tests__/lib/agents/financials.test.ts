import { calculateFinancials } from '@/lib/agents/financials'

const baseCommercial = {
  touristProximityScore: 75,
  competitorCount: 3,
  occupancyRateBenchmark: 70,
  averageDailyRate: 100_000,
  summary: '',
}

describe('calculateFinancials', () => {
  it('calculates revenue and ROI for a standard listing', () => {
    const result = calculateFinancials({
      minimumBid: 595_000_000,
      area: 300,
      commercialArea: baseCommercial,
      estimatedRenovationCost: 20_000_000,
    })
    // 10 rooms × 100,000 × 0.70 × 30 = 21,000,000
    expect(result.estimatedMonthlyRevenue).toBe(21_000_000)
    expect(result.estimatedMonthlyCost).toBeLessThan(result.estimatedMonthlyRevenue)
    expect(result.estimatedMonthlyProfit).toBeGreaterThan(0)
    expect(result.roiPercent).toBeGreaterThan(0)
    expect(result.breakEvenMonths).toBeGreaterThan(0)
  })

  it('guarantees at least 1 room for tiny properties', () => {
    const result = calculateFinancials({
      minimumBid: 100_000_000,
      area: 20, // < 30m²
      commercialArea: baseCommercial,
      estimatedRenovationCost: 0,
    })
    // 1 room × 100,000 × 0.70 × 30 = 2,100,000
    expect(result.estimatedMonthlyRevenue).toBe(2_100_000)
  })

  it('returns ROI 0 when totalInvestment is 0', () => {
    const result = calculateFinancials({
      minimumBid: 0,
      area: 300,
      commercialArea: baseCommercial,
      estimatedRenovationCost: 0,
    })
    expect(result.roiPercent).toBe(0)
  })

  it('returns breakEvenMonths 999 when monthly profit is not positive', () => {
    const result = calculateFinancials({
      minimumBid: 595_000_000,
      area: 30, // 1 room, low revenue
      commercialArea: { ...baseCommercial, occupancyRateBenchmark: 10, averageDailyRate: 10_000 },
      estimatedRenovationCost: 0,
    })
    // Revenue: 1 × 10,000 × 0.10 × 30 = 30,000
    // Costs: variable (12,000) + fixed (1,500,000 + 30×5000 = 1,650,000) = 1,662,000
    // Profit: 30,000 - 1,662,000 = negative → breakEvenMonths = 999
    expect(result.breakEvenMonths).toBe(999)
  })
})
