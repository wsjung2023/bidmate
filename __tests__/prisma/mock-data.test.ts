import { mockListings } from '@/prisma/mock-data'

describe('mockListings', () => {
  it('has exactly 20 listings', () => {
    expect(mockListings).toHaveLength(20)
  })

  it('each listing has required fields', () => {
    for (const listing of mockListings) {
      expect(listing.address).toBeTruthy()
      expect(Number(listing.appraisalValue)).toBeGreaterThan(0)
      expect(Number(listing.minimumBid)).toBeGreaterThan(0)
      expect(Number(listing.minimumBid)).toBeLessThanOrEqual(Number(listing.appraisalValue))
      expect(['AUCTION', 'PUBLIC_SALE', 'LODGING_LEASE']).toContain(listing.listingType)
      expect(listing.externalId).toMatch(/^MOCK-\d{3}$/)
    }
  })

  it('has a mix of listing types', () => {
    const types = new Set(mockListings.map((l) => l.listingType))
    expect(types.size).toBeGreaterThanOrEqual(3)
  })

  it('covers at least 5 different regions (first word of address)', () => {
    const regions = new Set(mockListings.map((l) => l.address.split(' ')[0]))
    expect(regions.size).toBeGreaterThanOrEqual(5)
  })

  it('has a mix of property types', () => {
    const types = new Set(mockListings.map((l) => l.propertyType))
    expect(types.size).toBeGreaterThanOrEqual(4)
  })

  it('all externalIds are unique', () => {
    const ids = mockListings.map((l) => l.externalId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
