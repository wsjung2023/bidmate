export type ModelPreset =
  | 'economy'          // Claude Haiku (all agents)
  | 'standard'         // Claude Sonnet + Opus report  ← default
  | 'premium'          // Claude Opus (all agents)
  | 'openai-mini'      // GPT-4o-mini (all agents)
  | 'openai-standard'  // GPT-4o (all agents)

export type ProviderModel = {
  provider: 'anthropic' | 'openai'
  modelId: string
}

export type PresetConfig = {
  id: ModelPreset
  label: string
  description: string
  badge: string
  analysisModel: ProviderModel
  reportModel: ProviderModel
  costPerListing: number  // USD estimate
}

export const PRESETS: Record<ModelPreset, PresetConfig> = {
  economy: {
    id: 'economy',
    label: 'Claude 절약',
    description: 'Claude Haiku로 모든 분석. 빠르고 저렴하지만 분석 깊이가 얕습니다.',
    badge: '⚡ 빠름',
    analysisModel: { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
    reportModel:   { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
    costPerListing: 0.01,
  },
  standard: {
    id: 'standard',
    label: 'Claude 균형',
    description: 'Claude Sonnet으로 분석, Opus로 최종 보고서. 품질과 비용의 균형.',
    badge: '⭐ 권장',
    analysisModel: { provider: 'anthropic', modelId: 'claude-sonnet-4-6' },
    reportModel:   { provider: 'anthropic', modelId: 'claude-opus-4-8' },
    costPerListing: 0.10,
  },
  premium: {
    id: 'premium',
    label: 'Claude 최고품질',
    description: 'Claude Opus로 모든 단계 분석. 가장 정확하고 심층적인 보고서.',
    badge: '💎 최고',
    analysisModel: { provider: 'anthropic', modelId: 'claude-opus-4-8' },
    reportModel:   { provider: 'anthropic', modelId: 'claude-opus-4-8' },
    costPerListing: 0.25,
  },
  'openai-mini': {
    id: 'openai-mini',
    label: 'GPT-4o-mini 절약',
    description: 'OpenAI GPT-4o-mini로 모든 분석. 가장 저렴한 옵션.',
    badge: '💰 최저가',
    analysisModel: { provider: 'openai', modelId: 'gpt-4o-mini' },
    reportModel:   { provider: 'openai', modelId: 'gpt-4o-mini' },
    costPerListing: 0.005,
  },
  'openai-standard': {
    id: 'openai-standard',
    label: 'GPT-4o 표준',
    description: 'OpenAI GPT-4o로 모든 분석. Claude 대비 저렴하고 빠릅니다.',
    badge: '🔵 OpenAI',
    analysisModel: { provider: 'openai', modelId: 'gpt-4o' },
    reportModel:   { provider: 'openai', modelId: 'gpt-4o' },
    costPerListing: 0.05,
  },
}

export const DEFAULT_PRESET: ModelPreset = 'standard'
