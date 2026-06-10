import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { SettingsForm } from './SettingsForm'
import { ModelPresetSelector } from './ModelPresetSelector'
import type { ModelPreset } from '@/lib/llm/presets'
import { DEFAULT_PRESET } from '@/lib/llm/presets'

export default async function SettingsPage() {
  const session = await auth()
  const isAdmin = session?.user.role === 'ADMIN'

  const [criteria, appConfig] = await Promise.all([
    session
      ? prisma.investmentCriteria.findUnique({ where: { userId: session.user.id } })
      : null,
    isAdmin
      ? prisma.appConfig.upsert({
          where: { id: 'default' },
          create: { id: 'default', pipelinePreset: DEFAULT_PRESET },
          update: {},
        })
      : null,
  ])

  const serializable = criteria
    ? {
        minScore: criteria.minScore,
        regions: criteria.regions,
        telegramChatId: criteria.telegramChatId ?? null,
        notifyEnabled: criteria.notifyEnabled,
      }
    : null

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">투자 기준 및 알림 설정</h2>
        <SettingsForm initialCriteria={serializable} />
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900">AI 모델 설정</h2>
            <p className="text-sm text-gray-500 mt-1">
              파이프라인에서 사용할 AI 모델 프리셋을 선택하세요. 분석 품질과 비용이 달라집니다.
            </p>
          </div>
          <ModelPresetSelector
            initialPreset={(appConfig?.pipelinePreset ?? DEFAULT_PRESET) as ModelPreset}
          />
        </div>
      )}
    </div>
  )
}
