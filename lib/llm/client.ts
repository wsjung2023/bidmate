import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { z } from 'zod'

export type LLMTier = 'fast' | 'standard' | 'premium'

// fast     → claude-haiku-4-5     ($1/$5 per 1M)   — classification, filtering
// standard → claude-sonnet-4-6   ($3/$15 per 1M)  — main analysis (default)
// premium  → claude-opus-4-8     ($5/$25 per 1M)  — final report, complex reasoning
const MODEL_IDS: Record<LLMTier, string> = {
  fast: 'claude-haiku-4-5-20251001',
  standard: 'claude-sonnet-4-6',
  premium: 'claude-opus-4-8',
}

function getModel(tier: LLMTier) {
  return anthropic(MODEL_IDS[tier])
}

export async function callLLM(
  prompt: string,
  tier: LLMTier = 'standard',
  systemPrompt?: string,
): Promise<string> {
  const { text } = await generateText({
    model: getModel(tier),
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
    maxOutputTokens: 4096,
  })
  return text
}

export async function callLLMStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  tier: LLMTier = 'standard',
  systemPrompt?: string,
): Promise<T> {
  const { object } = await generateObject({
    model: getModel(tier),
    schema,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
  })
  return object
}
