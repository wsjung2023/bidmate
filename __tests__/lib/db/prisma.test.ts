/**
 * @jest-environment node
 */

// Set env var before module is loaded so createPrismaClient() doesn't throw
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

import { prisma } from '@/lib/db/prisma'

describe('Prisma client singleton', () => {
  it('exports a PrismaClient instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
    expect(typeof prisma.listing).toBe('object')
    expect(typeof prisma.user).toBe('object')
    expect(typeof prisma.analysis).toBe('object')
    expect(typeof prisma.report).toBe('object')
  })
})
