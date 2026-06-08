import { mockListings } from './mock-data'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding 20 mock Korean property listings...')

  await prisma.listing.deleteMany({ where: { source: 'mock' } })
  console.log('Cleared previous mock data.')

  let count = 0
  for (const listing of mockListings) {
    await prisma.listing.create({
      data: {
        externalId: listing.externalId,
        source: listing.source,
        listingType: listing.listingType,
        propertyType: listing.propertyType,
        address: listing.address,
        addressDetail: listing.addressDetail,
        latitude: listing.latitude,
        longitude: listing.longitude,
        appraisalValue: BigInt(listing.appraisalValue),
        minimumBid: BigInt(listing.minimumBid),
        area: listing.area,
        floorInfo: listing.floorInfo,
        buildYear: listing.buildYear,
        auctionDate: listing.auctionDate,
        auctionCount: listing.auctionCount,
        caseNumber: listing.caseNumber,
        court: listing.court,
      },
    })
    count++
  }

  console.log(`✓ Seeded ${count} listings.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
