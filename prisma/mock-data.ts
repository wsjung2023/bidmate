import type { ListingType, PropertyType } from '@prisma/client'

export type MockListing = {
  externalId: string
  source: string
  listingType: ListingType
  propertyType: PropertyType
  address: string
  addressDetail?: string
  latitude: number
  longitude: number
  appraisalValue: number
  minimumBid: number
  area: number
  floorInfo: string
  buildYear: number
  auctionDate?: Date
  auctionCount: number
  caseNumber?: string
  court?: string
}

export const mockListings: MockListing[] = [
  { externalId: 'MOCK-001', source: 'mock', listingType: 'AUCTION', propertyType: 'PENSION', address: '강원도 평창군 대관령면 올림픽로 825', latitude: 37.6536, longitude: 128.674, appraisalValue: 850_000_000, minimumBid: 595_000_000, area: 412.5, floorInfo: '지상 3층', buildYear: 2015, auctionDate: new Date('2026-07-15'), auctionCount: 1, caseNumber: '2026타경12345', court: '춘천지방법원 강릉지원' },
  { externalId: 'MOCK-002', source: 'mock', listingType: 'AUCTION', propertyType: 'GUESTHOUSE', address: '제주특별자치도 서귀포시 안덕면 창천리 1234-5', latitude: 33.2731, longitude: 126.3633, appraisalValue: 620_000_000, minimumBid: 434_000_000, area: 285.0, floorInfo: '지상 2층', buildYear: 2018, auctionDate: new Date('2026-07-22'), auctionCount: 0, caseNumber: '2026타경67890', court: '제주지방법원' },
  { externalId: 'MOCK-003', source: 'mock', listingType: 'PUBLIC_SALE', propertyType: 'HOTEL', address: '경상북도 경주시 보문동 1000-1', latitude: 35.8343, longitude: 129.2566, appraisalValue: 4_200_000_000, minimumBid: 3_360_000_000, area: 1850.0, floorInfo: '지상 5층 / 지하 1층', buildYear: 2003, auctionDate: new Date('2026-08-05'), auctionCount: 0, caseNumber: 'OB-2026-11111' },
  { externalId: 'MOCK-004', source: 'mock', listingType: 'AUCTION', propertyType: 'MOTEL', address: '전라남도 여수시 오동도로 123', latitude: 34.7469, longitude: 127.7413, appraisalValue: 980_000_000, minimumBid: 490_000_000, area: 540.0, floorInfo: '지상 4층', buildYear: 1998, auctionDate: new Date('2026-07-30'), auctionCount: 3, caseNumber: '2026타경33333', court: '광주지방법원 순천지원' },
  { externalId: 'MOCK-005', source: 'mock', listingType: 'AUCTION', propertyType: 'PENSION', address: '충청남도 태안군 소원면 의항리 456-7', latitude: 36.9237, longitude: 126.1232, appraisalValue: 380_000_000, minimumBid: 266_000_000, area: 198.5, floorInfo: '지상 2층', buildYear: 2012, auctionDate: new Date('2026-08-12'), auctionCount: 1, caseNumber: '2026타경44444', court: '대전지방법원 홍성지원' },
  { externalId: 'MOCK-006', source: 'mock', listingType: 'LODGING_LEASE', propertyType: 'GUESTHOUSE', address: '부산광역시 해운대구 달맞이길 62번길 15', latitude: 35.1631, longitude: 129.1816, appraisalValue: 750_000_000, minimumBid: 600_000_000, area: 320.0, floorInfo: '지상 3층', buildYear: 2010, auctionCount: 0 },
  { externalId: 'MOCK-007', source: 'mock', listingType: 'AUCTION', propertyType: 'RESORT', address: '강원도 속초시 대포동 111-22', latitude: 38.185, longitude: 128.5977, appraisalValue: 2_800_000_000, minimumBid: 1_960_000_000, area: 2200.0, floorInfo: '지상 6층 / 지하 2층', buildYear: 2007, auctionDate: new Date('2026-09-01'), auctionCount: 1, caseNumber: '2026타경55555', court: '춘천지방법원 속초지원' },
  { externalId: 'MOCK-008', source: 'mock', listingType: 'PUBLIC_SALE', propertyType: 'PENSION', address: '경기도 가평군 청평면 호반로 789', latitude: 37.6236, longitude: 127.5145, appraisalValue: 520_000_000, minimumBid: 416_000_000, area: 245.0, floorInfo: '지상 2층', buildYear: 2016, auctionDate: new Date('2026-08-20'), auctionCount: 0, caseNumber: 'OB-2026-22222' },
  { externalId: 'MOCK-009', source: 'mock', listingType: 'AUCTION', propertyType: 'GUESTHOUSE', address: '제주특별자치도 제주시 한림읍 수원리 2345', latitude: 33.4119, longitude: 126.2624, appraisalValue: 450_000_000, minimumBid: 225_000_000, area: 180.0, floorInfo: '지상 2층', buildYear: 2014, auctionDate: new Date('2026-07-28'), auctionCount: 2, caseNumber: '2026타경77777', court: '제주지방법원' },
  { externalId: 'MOCK-010', source: 'mock', listingType: 'AUCTION', propertyType: 'BUILDING', address: '경상남도 통영시 중앙로 55', latitude: 34.8544, longitude: 128.433, appraisalValue: 1_100_000_000, minimumBid: 770_000_000, area: 680.0, floorInfo: '지상 5층', buildYear: 2000, auctionDate: new Date('2026-08-25'), auctionCount: 1, caseNumber: '2026타경88888', court: '창원지방법원 통영지원' },
  { externalId: 'MOCK-011', source: 'mock', listingType: 'LODGING_LEASE', propertyType: 'MOTEL', address: '강원도 강릉시 해안로 500', latitude: 37.7519, longitude: 128.8785, appraisalValue: 1_350_000_000, minimumBid: 1_080_000_000, area: 820.0, floorInfo: '지상 5층 / 지하 1층', buildYear: 2008, auctionCount: 0 },
  { externalId: 'MOCK-012', source: 'mock', listingType: 'AUCTION', propertyType: 'PENSION', address: '전라북도 무주군 설천면 무설로 1000', latitude: 35.9145, longitude: 127.6752, appraisalValue: 290_000_000, minimumBid: 203_000_000, area: 165.0, floorInfo: '지상 2층', buildYear: 2019, auctionDate: new Date('2026-09-10'), auctionCount: 0, caseNumber: '2026타경99999', court: '전주지방법원 남원지원' },
  { externalId: 'MOCK-013', source: 'mock', listingType: 'PUBLIC_SALE', propertyType: 'HOTEL', address: '충청북도 청주시 흥덕구 강서로 234', latitude: 36.6359, longitude: 127.4426, appraisalValue: 3_600_000_000, minimumBid: 2_520_000_000, area: 2800.0, floorInfo: '지상 8층 / 지하 2층', buildYear: 2005, auctionDate: new Date('2026-09-15'), auctionCount: 1, caseNumber: 'OB-2026-33333' },
  { externalId: 'MOCK-014', source: 'mock', listingType: 'AUCTION', propertyType: 'GUESTHOUSE', address: '경기도 양평군 서종면 문호리 789', latitude: 37.5374, longitude: 127.5126, appraisalValue: 340_000_000, minimumBid: 238_000_000, area: 152.0, floorInfo: '지상 2층', buildYear: 2017, auctionDate: new Date('2026-08-08'), auctionCount: 0, caseNumber: '2026타경11112', court: '수원지방법원 여주지원' },
  { externalId: 'MOCK-015', source: 'mock', listingType: 'AUCTION', propertyType: 'MOTEL', address: '인천광역시 옹진군 백령면 진촌리 333', latitude: 37.9684, longitude: 124.7142, appraisalValue: 720_000_000, minimumBid: 360_000_000, area: 480.0, floorInfo: '지상 4층', buildYear: 2001, auctionDate: new Date('2026-07-20'), auctionCount: 3, caseNumber: '2026타경22223', court: '인천지방법원' },
  { externalId: 'MOCK-016', source: 'mock', listingType: 'LODGING_LEASE', propertyType: 'PENSION', address: '경상북도 봉화군 춘양면 서벽리 567', latitude: 36.9283, longitude: 128.9012, appraisalValue: 220_000_000, minimumBid: 176_000_000, area: 118.0, floorInfo: '지상 2층', buildYear: 2021, auctionCount: 0 },
  { externalId: 'MOCK-017', source: 'mock', listingType: 'AUCTION', propertyType: 'RESORT', address: '강원도 홍천군 서면 팔봉리 1000', latitude: 37.7231, longitude: 127.8012, appraisalValue: 1_850_000_000, minimumBid: 1_295_000_000, area: 1450.0, floorInfo: '지상 4층 / 지하 1층', buildYear: 2009, auctionDate: new Date('2026-09-20'), auctionCount: 1, caseNumber: '2026타경44445', court: '춘천지방법원' },
  { externalId: 'MOCK-018', source: 'mock', listingType: 'PUBLIC_SALE', propertyType: 'GUESTHOUSE', address: '전라남도 완도군 완도읍 청해진남로 45', latitude: 34.3113, longitude: 126.7558, appraisalValue: 280_000_000, minimumBid: 224_000_000, area: 135.0, floorInfo: '지상 2층', buildYear: 2020, auctionDate: new Date('2026-08-28'), auctionCount: 0, caseNumber: 'OB-2026-44444' },
  { externalId: 'MOCK-019', source: 'mock', listingType: 'AUCTION', propertyType: 'HOTEL', address: '경기도 이천시 설봉로 123', latitude: 37.2791, longitude: 127.4377, appraisalValue: 5_500_000_000, minimumBid: 3_850_000_000, area: 3200.0, floorInfo: '지상 8층 / 지하 2층', buildYear: 2001, auctionDate: new Date('2026-09-25'), auctionCount: 2, caseNumber: '2026타경55556', court: '수원지방법원 여주지원' },
  { externalId: 'MOCK-020', source: 'mock', listingType: 'AUCTION', propertyType: 'PENSION', address: '강원도 인제군 북면 한계리 789-10', latitude: 38.0234, longitude: 128.1745, appraisalValue: 460_000_000, minimumBid: 322_000_000, area: 225.0, floorInfo: '지상 3층', buildYear: 2014, auctionDate: new Date('2026-08-18'), auctionCount: 1, caseNumber: '2026타경66667', court: '춘천지방법원 속초지원' },
]
