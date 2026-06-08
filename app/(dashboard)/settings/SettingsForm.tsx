'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const FormSchema = z.object({
  minScore: z.coerce.number().min(0).max(100),
  regions: z.string(),
  telegramChatId: z.string().optional(),
  notifyEnabled: z.boolean(),
})

type FormValues = z.infer<typeof FormSchema>

type Criteria = {
  minScore: number
  regions: string[]
  telegramChatId?: string | null
  notifyEnabled: boolean
} | null

export function SettingsForm({ initialCriteria }: { initialCriteria: Criteria }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      minScore: initialCriteria?.minScore ?? 60,
      regions: initialCriteria?.regions.join(', ') ?? '',
      telegramChatId: initialCriteria?.telegramChatId ?? '',
      notifyEnabled: initialCriteria?.notifyEnabled ?? false,
    },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    setSaved(false)

    const regions = data.regions
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        minScore: data.minScore,
        regions,
        telegramChatId: data.telegramChatId || undefined,
        notifyEnabled: data.notifyEnabled,
        propertyTypes: [],
        listingTypes: [],
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? '저장 실패')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          최소 점수 기준 (0-100)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          {...register('minScore')}
          className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">이 점수 미만의 매물은 Telegram 알림에서 제외</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          관심 지역 (쉼표로 구분)
        </label>
        <input
          type="text"
          placeholder="강원도, 제주도, 경상북도"
          {...register('regions')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Telegram 알림 설정</h3>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">설정 방법:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Telegram에서 <code className="bg-blue-100 px-1 rounded">@BotFather</code>로 봇을 만들고 토큰을 .env에 저장</li>
            <li>봇과 대화를 시작하고 <code className="bg-blue-100 px-1 rounded">@userinfobot</code>으로 Chat ID 확인</li>
            <li>아래에 Chat ID 입력 후 저장</li>
          </ol>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telegram Chat ID
          </label>
          <input
            type="text"
            placeholder="예: 123456789"
            {...register('telegramChatId')}
            className="w-48 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('notifyEnabled')} className="rounded" />
          <span className="text-sm text-gray-700">새 고점수 매물 발견 시 Telegram 알림 받기</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? '저장 중...' : '설정 저장'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ 저장되었습니다</span>}
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
    </form>
  )
}
