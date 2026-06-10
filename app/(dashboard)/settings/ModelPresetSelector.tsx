'use client'

import { useState } from 'react'
import { PRESETS } from '@/lib/llm/presets'
import type { ModelPreset } from '@/lib/llm/presets'

const MODEL_LABEL: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Claude Haiku',
  'claude-sonnet-4-6': 'Claude Sonnet',
  'claude-opus-4-8': 'Claude Opus',
  'gpt-4o-mini': 'GPT-4o mini',
  'gpt-4o': 'GPT-4o',
}

const PROVIDER_COLOR: Record<string, string> = {
  anthropic: 'bg-orange-50 text-orange-700',
  openai: 'bg-green-50 text-green-700',
}

export function ModelPresetSelector({ initialPreset }: { initialPreset: ModelPreset }) {
  const [selected, setSelected] = useState<ModelPreset>(initialPreset)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(preset: ModelPreset) {
    setSelected(preset)
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pipelinePreset: preset }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? '저장 실패')
        setSelected(initialPreset)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        {saved && <span className="text-green-600 text-sm">✓ 저장되었습니다</span>}
        {error && <span className="text-red-500 text-sm">{error}</span>}
        {saving && <span className="text-gray-400 text-sm">저장 중...</span>}
      </div>

      <div className="grid gap-3">
        {(Object.values(PRESETS) as (typeof PRESETS)[ModelPreset][]).map((preset) => {
          const isSelected = selected === preset.id
          const analysisLabel = MODEL_LABEL[preset.analysisModel.modelId] ?? preset.analysisModel.modelId
          const reportLabel = MODEL_LABEL[preset.reportModel.modelId] ?? preset.reportModel.modelId
          const sameModel = preset.analysisModel.modelId === preset.reportModel.modelId

          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id)}
              disabled={saving}
              className={[
                'w-full text-left rounded-xl border-2 p-4 transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white',
                saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{preset.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {preset.badge}
                    </span>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        현재 선택
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{preset.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${PROVIDER_COLOR[preset.analysisModel.provider]}`}
                    >
                      분석: {analysisLabel}
                    </span>
                    {!sameModel && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${PROVIDER_COLOR[preset.reportModel.provider]}`}
                      >
                        보고서: {reportLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-gray-900">
                    ${preset.costPerListing.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-400">/ 매물</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        * 비용은 추정치이며 실제 토큰 사용량에 따라 달라집니다. 다음 파이프라인 실행부터 적용됩니다.
      </p>
    </div>
  )
}
