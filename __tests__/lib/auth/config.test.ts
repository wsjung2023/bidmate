// Set env vars before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AUTH_SECRET = 'test-secret-32-chars-minimum-length'
process.env.AUTH_GOOGLE_ID = 'test-google-id'
process.env.AUTH_GOOGLE_SECRET = 'test-google-secret'

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({ name: 'prisma' })),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {},
}))

jest.mock('next-auth', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      handlers: { GET: jest.fn(), POST: jest.fn() },
      auth: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    })),
  }
})

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn((opts) => ({ id: 'google', ...opts })),
}))

import { authConfig } from '@/lib/auth/config'

describe('authConfig', () => {
  it('exports a valid Auth.js config object', () => {
    expect(authConfig).toBeDefined()
    expect(authConfig.providers).toBeDefined()
    expect(Array.isArray(authConfig.providers)).toBe(true)
    expect(authConfig.providers.length).toBeGreaterThan(0)
  })

  it('has an adapter configured', () => {
    expect(authConfig.adapter).toBeDefined()
  })

  it('has a signIn page configured', () => {
    expect(authConfig.pages?.signIn).toBe('/login')
  })
})
