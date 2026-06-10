import { render, screen } from '@testing-library/react'
import { MapView } from '@/app/(dashboard)/map/MapView'

jest.mock('react-kakao-maps-sdk', () => ({
  useKakaoLoader: () => [false, undefined],
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="kakao-map">{children}</div>
  ),
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-overlay">{children}</div>
  ),
}))

const mockListings = [
  {
    id: '1',
    address: '강원도 강릉시 주문진읍 해안로 1',
    propertyType: 'PENSION',
    listingType: 'AUCTION',
    minimumBid: BigInt(200_000_000),
    appraisalValue: BigInt(280_000_000),
    area: 120,
    auctionDate: null,
    auctionCount: 0,
    court: '춘천지법',
    latitude: 37.9,
    longitude: 128.9,
    score: 72,
  },
  {
    id: '2',
    address: '제주특별자치도 서귀포시 색달동 1234',
    propertyType: 'GUESTHOUSE',
    listingType: 'AUCTION',
    minimumBid: BigInt(150_000_000),
    appraisalValue: BigInt(200_000_000),
    area: 80,
    auctionDate: null,
    auctionCount: 1,
    court: '제주지법',
    latitude: 33.2,
    longitude: 126.5,
    score: null,
  },
]

test('지도와 매물 목록 패널을 렌더링한다', () => {
  render(<MapView listings={mockListings as any} />)
  expect(screen.getByTestId('kakao-map')).toBeInTheDocument()
  expect(screen.getByText(/강원도 강릉시/)).toBeInTheDocument()
  expect(screen.getByText(/제주특별자치도/)).toBeInTheDocument()
})

test('좌표 없는 매물은 지도 마커를 생성하지 않는다', () => {
  const noCoordListings = [{ ...mockListings[0], latitude: null, longitude: null }]
  render(<MapView listings={noCoordListings as any} />)
  expect(screen.queryByTestId('map-overlay')).not.toBeInTheDocument()
})

test('매물 카운트를 표시한다', () => {
  render(<MapView listings={mockListings as any} />)
  expect(screen.getByText(/2건/)).toBeInTheDocument()
})
