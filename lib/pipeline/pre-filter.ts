import type { Listing, InvestmentCriteria } from '@prisma/client'

function matchesCriteria(listing: Listing, criteria: InvestmentCriteria): boolean {
  if (criteria.regions.length > 0) {
    const addressLower = listing.address.toLowerCase()
    const regionMatch = criteria.regions.some((r) => addressLower.includes(r.toLowerCase()))
    if (!regionMatch) return false
  }

  const bid = Number(listing.minimumBid)
  if (criteria.minBid != null && bid < Number(criteria.minBid)) return false
  if (criteria.maxBid != null && bid > Number(criteria.maxBid)) return false

  if (criteria.propertyTypes.length > 0) {
    if (!criteria.propertyTypes.includes(listing.propertyType as any)) return false
  }

  if (criteria.listingTypes.length > 0) {
    if (!criteria.listingTypes.includes(listing.listingType as any)) return false
  }

  return true
}

export function matchesAnyCriteria(
  listing: Listing,
  allCriteria: InvestmentCriteria[],
): boolean {
  if (allCriteria.length === 0) return true
  return allCriteria.some((c) => matchesCriteria(listing, c))
}
