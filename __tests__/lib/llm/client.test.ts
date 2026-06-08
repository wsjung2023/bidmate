// Set env before imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.ANTHROPIC_API_KEY = 'test-key'

jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'mock response' }),
  generateObject: jest.fn().mockResolvedValue({ object: { result: 'ok' } }),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn().mockReturnValue('mock-model'),
}))

const { callLLM, callLLMStructured } = require('@/lib/llm/client')

describe('LLM client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('callLLM returns text', async () => {
    const result = await callLLM('test prompt')
    expect(result).toBe('mock response')
  })

  it('callLLMStructured returns typed object', async () => {
    const { z } = require('zod')
    const schema = z.object({ result: z.string() })
    const result = await callLLMStructured('test prompt', schema)
    expect(result).toEqual({ result: 'ok' })
  })

  it('supports fast/standard/premium tiers', async () => {
    const { generateText } = jest.requireMock('ai')
    await callLLM('p1', 'fast')
    await callLLM('p2', 'standard')
    await callLLM('p3', 'premium')
    expect(generateText).toHaveBeenCalledTimes(3)
  })
})
