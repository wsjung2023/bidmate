export type RightsAnalysis = {
  hasLien: boolean
  hasInjunction: boolean
  hasLegalSurfaceRight: boolean
  hasOccupancy: boolean
  hasUnpaidRent: boolean
  hasTaxLien: boolean
  clearanceEstimate: number
  summary: string
}

export type LicenseCheck = {
  eligible: boolean
  propertyUseChangeable: boolean
  estimatedFee: number
  obstacles: string[]
  summary: string
}

export type CommercialArea = {
  touristProximityScore: number  // 0-100
  competitorCount: number
  occupancyRateBenchmark: number  // % (e.g. 72 = 72%)
  averageDailyRate: number  // KRW
  summary: string
}

export type Financials = {
  estimatedMonthlyRevenue: number  // KRW
  estimatedMonthlyCost: number     // KRW
  estimatedMonthlyProfit: number   // KRW
  roiPercent: number               // annual ROI %
  breakEvenMonths: number
  summary: string
}

export type RiskFactors = {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  factors: string[]
  summary: string
}

export type Strategy = {
  recommendedBid: number  // KRW
  operatingModel: string
  keyActions: string[]
  summary: string
}

export type AgentOutputs = {
  rightsAnalysis: RightsAnalysis
  licenseCheck: LicenseCheck
  commercialArea: CommercialArea
  financials: Financials
  riskFactors: RiskFactors
  strategy?: Strategy
}
