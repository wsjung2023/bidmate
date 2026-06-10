import { matchesAnyCriteria } from '@/lib/pipeline/pre-filter'
import type { Listing } from '@prisma/client'
import type { InvestmentCriteria } from '@prisma/client'

const baseListing: Listing = {
  id: 'listing-1',
  externalId: null,
  source: 'court_auction',
  address: '강원도 평창군 대관령면 올림픽로 715',
  addressDetail: null,
  propertyType: 'PENSION',
  listingType: 'AUCTION',
  minimumBid: BigInt(230_000_000),
  appraisalValue: BigInt(310_000_000),
  area: 150,
  auctionDate: null,
  auctionCount: 0,
  court: '춘천지법',
  caseNumber: null,
  latitude: null,
  longitude: null,
  floorInfo: null,
  buildYear: null,
  rawData: null,
  score: null,
  isDropped: false,
  droppedReason: null,
  collectedAt: new Date(),
  updatedAt: new Date(),
}

const baseCriteria: InvestmentCriteria = {
  id: 'criteria-1',
  userId: 'user-1',
  regions: [],
  minBid: null,
  maxBid: null,
  minArea: null,
  maxArea: null,
  propertyTypes: [],
  listingTypes: [],
  minRoi: null,
  minScore: 60,
  telegramChatId: null,
  notifyEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('matchesAnyCriteria', () => {
  test('기준 없으면 true 반환 (모든 매물 분석)', () => {
    expect(matchesAnyCriteria(baseListing, [])).toBe(true)
  })

  test('지역 기준 일치 → true', () => {
    const criteria = { ...baseCriteria, regions: ['강원'] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('지역 기준 불일치 → false', () => {
    const criteria = { ...baseCriteria, regions: ['제주'] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('예산 범위 내 → true', () => {
    const criteria = {
      ...baseCriteria,
      minBid: BigInt(200_000_000),
      maxBid: BigInt(300_000_000),
    }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('예산 초과 → false', () => {
    const criteria = {
      ...baseCriteria,
      minBid: BigInt(100_000_000),
      maxBid: BigInt(200_000_000),
    }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('물건 종류 일치 → true', () => {
    const criteria = { ...baseCriteria, propertyTypes: ['PENSION' as any] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(true)
  })

  test('물건 종류 불일치 → false', () => {
    const criteria = { ...baseCriteria, propertyTypes: ['HOTEL' as any] }
    expect(matchesAnyCriteria(baseListing, [criteria])).toBe(false)
  })

  test('여러 사용자 중 하나라도 기준 일치 → true', () => {
    const criteriaA = { ...baseCriteria, id: 'a', regions: ['제주'] }
    const criteriaB = { ...baseCriteria, id: 'b', regions: ['강원'] }
    expect(matchesAnyCriteria(baseListing, [criteriaA, criteriaB])).toBe(true)
  })
})
