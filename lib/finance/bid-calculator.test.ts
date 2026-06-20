/** @jest-environment node */
import {
  DEFAULT_BID_INPUTS,
  calcForBid,
  calcMaxBid,
  buildSimulation,
  deriveInputsFromListing,
  verdict,
  type BidCalculatorInput,
} from './bid-calculator'

// Excel 스크린샷 기준값으로 구성한 표준 입력.
const EXCEL_INPUT: BidCalculatorInput = {
  ...DEFAULT_BID_INPUTS,
  appraisalValue: 329_000_000,
  minimumBid: 230_300_000,
  targetSalePrice: 150_000_000,
  targetRoi: 0.1,
  baseWinRate: 0.91,
}

describe('calcMaxBid — Excel 회귀 검증', () => {
  it('목표 10% 기준 최대입찰가가 Excel의 133,453,975와 일치', () => {
    const maxBid = calcMaxBid(EXCEL_INPUT)
    expect(Math.round(maxBid)).toBe(133_453_975)
  })

  it('고정비 합계가 4,960,000과 일치', () => {
    // fixedCost는 내부 함수라 calcForBid의 구성요소로 간접 검증한다.
    // 입찰가 0일 때: 취득비용(고정분)+보유비용(고정분)+양도비용 = 고정비.
    const r = calcForBid(EXCEL_INPUT, 0)
    const fixedFromCosts =
      r.acquisitionCost + r.holdingCost + r.transferCost + EXCEL_INPUT.transferTax
    expect(Math.round(fixedFromCosts)).toBe(4_960_000)
  })
})

describe('calcForBid — 정합성', () => {
  it('입찰가 = 최대입찰가일 때 수익률 ≈ 목표수익률', () => {
    const maxBid = calcMaxBid(EXCEL_INPUT)
    const result = calcForBid(EXCEL_INPUT, maxBid)
    expect(Math.abs(result.roi - EXCEL_INPUT.targetRoi)).toBeLessThan(1e-9)
  })

  it('대출금·낙찰가율이 정의대로 계산됨', () => {
    const bid = 100_000_000
    const result = calcForBid(EXCEL_INPUT, bid)
    expect(result.loanAmount).toBe(bid * EXCEL_INPUT.loanRatio)
    expect(result.winRate).toBeCloseTo(bid / EXCEL_INPUT.appraisalValue, 10)
    expect(result.deposit).toBe(EXCEL_INPUT.minimumBid * EXCEL_INPUT.depositRate)
  })
})

describe('buildSimulation', () => {
  it('7개 행을 생성하고 입찰가가 단조 증가', () => {
    const rows = buildSimulation(EXCEL_INPUT)
    expect(rows).toHaveLength(7)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].bidPrice).toBeGreaterThan(rows[i - 1].bidPrice)
    }
  })

  it('가운데 행의 낙찰가율이 기준 낙찰가율과 일치', () => {
    const rows = buildSimulation(EXCEL_INPUT)
    expect(rows[3].winRate).toBeCloseTo(EXCEL_INPUT.baseWinRate, 10)
  })

  it('모든 행의 입찰보증금이 최저가×보증금률로 일정', () => {
    const rows = buildSimulation(EXCEL_INPUT)
    const expectedDeposit = EXCEL_INPUT.minimumBid * EXCEL_INPUT.depositRate
    for (const row of rows) {
      expect(row.deposit).toBe(expectedDeposit)
    }
  })
})

describe('deriveInputsFromListing', () => {
  it('감정가/최저가를 채우고 희망매도가 기본값 = 감정가', () => {
    const input = deriveInputsFromListing({
      appraisalValue: 329_000_000,
      minimumBid: 230_300_000,
    })
    expect(input.appraisalValue).toBe(329_000_000)
    expect(input.minimumBid).toBe(230_300_000)
    expect(input.targetSalePrice).toBe(329_000_000)
    expect(input.depositRate).toBe(0.1)
  })
})

describe('verdict', () => {
  it('수익률에 따라 판정 텍스트 반환', () => {
    expect(verdict(0.12, 0.1)).toBe('입찰 적정')
    expect(verdict(0.05, 0.1)).toBe('수익 낮음')
    expect(verdict(-0.2, 0.1)).toBe('입찰 부적정')
  })
})
