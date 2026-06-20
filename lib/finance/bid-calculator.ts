/**
 * 적정 입찰가 계산기 — 경매 낙찰 후 재매각(flip) 수익성 모델.
 *
 * 순수 계산 모듈: Prisma / React / next 의존성 없음.
 * 모든 금액은 KRW(원) 단위의 number, 모든 비율은 소수(예: 10% = 0.1).
 * 클라이언트(즉시 재계산)와 서버(스냅샷 저장) 양쪽에서 동일하게 사용한다.
 *
 * 운영 수익(임대) 모델인 lib/agents/financials.ts 와는 별개의 모델이다.
 */

export type BidCalculatorInput = {
  // 기준 금액
  appraisalValue: number // 감정가
  minimumBid: number // 최저가
  depositRate: number // 보증금률 (최저가 대비)

  // 대출 조건
  loanRatio: number // 대출비율 (입찰가 대비)
  loanRate: number // 대출금리 (연)
  loanMonths: number // 이자기간 (개월)
  prepaymentFeeRate: number // 중도상환수수료율 (대출금 대비)
  loanExtraCost: number // 대출 기타부대비용

  // 목표
  targetSalePrice: number // 희망매도가
  targetRoi: number // 목표 수익률
  baseWinRate: number // 기준 낙찰가율 (감정가 대비)
  stepUnit: number // 시뮬레이션 변동단위

  // 취득·보유·양도 비용
  acquisitionTaxRate: number // 취득세율 (입찰가 대비)
  legalFee: number // 법무비
  unpaidMgmtFee: number // 미납관리비(공용)
  courtFee: number // 법원수수료
  storageMgmtFee: number // 보관관리비
  evictionCost: number // 명도비/이사비
  repairCost: number // 수리비
  otherHoldingCost1: number // 기타 보유비
  otherHoldingCost2: number // 기타 보유비2
  brokerageRate: number // 중개수수료율 (희망매도가 대비)
  transferTax: number // 양도세/기타세금
}

export type BidResult = {
  bidPrice: number // 입찰가 B
  deposit: number // 입찰보증금 (최저가 × 보증금률)
  loanAmount: number // 대출금
  loanInterest: number // 대출이자
  acquisitionCost: number // 취득비용
  holdingCost: number // 보유비용
  transferCost: number // 양도비용
  saleProfit: number // 매매차익 (희망매도가 − 입찰가)
  netProfit: number // 세후손익
  investment: number // 투자금
  roi: number // 수익률
  winRate: number // 감정가 대비 낙찰가율
}

export type SimRow = BidResult & {
  verdict: string // 판정
}

export const DEFAULT_BID_INPUTS: BidCalculatorInput = {
  appraisalValue: 0,
  minimumBid: 0,
  depositRate: 0.1,

  loanRatio: 0.4,
  loanRate: 0.05,
  loanMonths: 6,
  prepaymentFeeRate: 0,
  loanExtraCost: 0,

  targetSalePrice: 0,
  targetRoi: 0.1,
  baseWinRate: 0.91,
  stepUnit: 0.01,

  acquisitionTaxRate: 0.011,
  legalFee: 1_000_000,
  unpaidMgmtFee: 0,
  courtFee: 50_000,
  storageMgmtFee: 150_000,
  evictionCost: 2_000_000,
  repairCost: 1_100_000,
  otherHoldingCost1: 0,
  otherHoldingCost2: 0,
  brokerageRate: 0.0044,
  transferTax: 0,
}

/** 입찰가에 비례하는 비용 계수 c (취득세 + 대출이자 + 중도상환수수료). */
function variableCoeff(input: BidCalculatorInput): number {
  return (
    input.acquisitionTaxRate +
    input.loanRatio * input.loanRate * (input.loanMonths / 12) +
    input.loanRatio * input.prepaymentFeeRate
  )
}

/** 입찰가와 무관한 고정비 합계 (양도비용·양도세 포함). */
function fixedCost(input: BidCalculatorInput): number {
  const transferCost = input.targetSalePrice * input.brokerageRate
  return (
    input.legalFee +
    input.courtFee +
    input.unpaidMgmtFee +
    input.storageMgmtFee +
    input.evictionCost +
    input.repairCost +
    input.otherHoldingCost1 +
    input.otherHoldingCost2 +
    input.loanExtraCost +
    transferCost +
    input.transferTax
  )
}

/** 주어진 입찰가 B에 대한 전체 비용·손익 계산. */
export function calcForBid(input: BidCalculatorInput, bidPrice: number): BidResult {
  const loanAmount = bidPrice * input.loanRatio
  const loanInterest = loanAmount * input.loanRate * (input.loanMonths / 12)
  const prepaymentFee = loanAmount * input.prepaymentFeeRate

  const acquisitionCost =
    bidPrice * input.acquisitionTaxRate + input.legalFee + input.courtFee + input.unpaidMgmtFee

  const holdingCost =
    loanInterest +
    input.storageMgmtFee +
    input.evictionCost +
    input.repairCost +
    input.otherHoldingCost1 +
    input.otherHoldingCost2 +
    prepaymentFee +
    input.loanExtraCost

  const transferCost = input.targetSalePrice * input.brokerageRate
  const saleProfit = input.targetSalePrice - bidPrice

  const netProfit =
    input.targetSalePrice -
    bidPrice -
    acquisitionCost -
    holdingCost -
    transferCost -
    input.transferTax

  const investment =
    bidPrice - loanAmount + acquisitionCost + holdingCost + transferCost + input.transferTax

  const roi = investment !== 0 ? netProfit / investment : 0
  const winRate = input.appraisalValue !== 0 ? bidPrice / input.appraisalValue : 0

  return {
    bidPrice,
    deposit: input.minimumBid * input.depositRate,
    loanAmount,
    loanInterest,
    acquisitionCost,
    holdingCost,
    transferCost,
    saleProfit,
    netProfit,
    investment,
    roi,
    winRate,
  }
}

/**
 * 목표 수익률 r을 만족하는 최대 입찰가(역산).
 * 반올림하지 않은 원시 float을 반환한다(호출 측에서 반올림).
 */
export function calcMaxBid(input: BidCalculatorInput): number {
  const r = input.targetRoi
  const c = variableCoeff(input)
  const fixed = fixedCost(input)
  const profitCoeff = 1 + c
  const investCoeff = 1 - input.loanRatio + c

  const denominator = r * investCoeff + profitCoeff
  if (denominator === 0) return 0
  return (input.targetSalePrice - fixed * (1 + r)) / denominator
}

/** 수익률 대비 목표 달성 여부 판정 텍스트. */
export function verdict(roi: number, targetRoi: number): string {
  if (roi >= targetRoi) return '입찰 적정'
  if (roi >= 0) return '수익 낮음'
  return '입찰 부적정'
}

/**
 * 낙찰가율별 시뮬레이션 표.
 * 기준 낙찰가율 ± 3단계(변동단위)로 7행 생성.
 * 각 행의 입찰가 = 감정가 × 행별 낙찰가율.
 */
export function buildSimulation(input: BidCalculatorInput): SimRow[] {
  const rows: SimRow[] = []
  for (let k = -3; k <= 3; k++) {
    const rowWinRate = input.baseWinRate + k * input.stepUnit
    const bidPrice = input.appraisalValue * rowWinRate
    const result = calcForBid(input, bidPrice)
    rows.push({ ...result, verdict: verdict(result.roi, input.targetRoi) })
  }
  return rows
}

/**
 * 매물 정보로 입력 기본값 구성.
 * 감정가/최저가를 채우고, 희망매도가 기본값 = 감정가.
 */
export function deriveInputsFromListing(listing: {
  appraisalValue: number
  minimumBid: number
}): BidCalculatorInput {
  return {
    ...DEFAULT_BID_INPUTS,
    appraisalValue: listing.appraisalValue,
    minimumBid: listing.minimumBid,
    targetSalePrice: listing.appraisalValue,
  }
}
