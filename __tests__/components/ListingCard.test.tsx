import { render, screen } from '@testing-library/react'
import { ListingCard } from '@/components/ListingCard'

const mockListing = {
  id: 'test-id',
  externalId: null,
  source: 'court_auction',
  address: '강원도 평창군 대관령면 올림픽로 715',
  addressDetail: null,
  propertyType: 'PENSION' as const,
  listingType: 'AUCTION' as const,
  minimumBid: BigInt(230_000_000),
  appraisalValue: BigInt(310_000_000),
  area: 150,
  auctionDate: new Date('2026-07-15'),
  auctionCount: 3,
  court: '춘천지법',
  caseNumber: '2026타경1234',
  score: 85,
  isDropped: false,
  droppedReason: null,
  floorInfo: null,
  buildYear: null,
  latitude: null,
  longitude: null,
  rawData: null,
  collectedAt: new Date(),
  updatedAt: new Date(),
}

describe('ListingCard', () => {
  test('가격을 억 단위로 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('2.3억')).toBeInTheDocument()
  })

  test('할인율 계산 및 표시', () => {
    render(<ListingCard listing={mockListing} />)
    // (310-230)/310 = 25.8% → 26%
    expect(screen.getByText('26% 할인')).toBeInTheDocument()
  })

  test('유찰 횟수 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('3회 유찰')).toBeInTheDocument()
  })

  test('점수 배지 렌더링', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('85점')).toBeInTheDocument()
  })

  test('주소 표시', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText(/강원도 평창군/)).toBeInTheDocument()
  })
})
