import { generateText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import type { z } from 'zod'
import type { ProviderModel } from './presets'
import { PRESETS, DEFAULT_PRESET } from './presets'
import type { ModelPreset } from './presets'

export type LLMTier = 'fast' | 'standard' | 'premium'

// Legacy tier → default preset model mapping (used when no preset is active)
const LEGACY_MODEL_IDS: Record<LLMTier, ProviderModel> = {
  fast:     { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
  standard: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
  premium:  { provider: 'anthropic', modelId: 'claude-opus-4-8' },
}

function getLanguageModel(pm: ProviderModel) {
  if (pm.provider === 'openai') return openai(pm.modelId)
  return anthropic(pm.modelId)
}

function resolveModel(tier: LLMTier, preset?: ModelPreset): ProviderModel {
  if (!preset) return LEGACY_MODEL_IDS[tier]
  const config = PRESETS[preset]
  return tier === 'premium' ? config.reportModel : config.analysisModel
}

export async function callLLM(
  prompt: string,
  tier: LLMTier = 'standard',
  systemPrompt?: string,
  preset?: ModelPreset,
): Promise<string> {
  const model = resolveModel(tier, preset)
  const { text } = await generateText({
    model: getLanguageModel(model),
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
  preset?: ModelPreset,
): Promise<T> {
  const model = resolveModel(tier, preset)
  const { object } = await generateObject({
    model: getLanguageModel(model),
    schema,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
  })
  return object
}
