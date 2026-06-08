import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const session = await auth()
  const criteria = session
    ? await prisma.investmentCriteria.findUnique({ where: { userId: session.user.id } })
    : null

  const serializable = criteria
    ? {
        minScore: criteria.minScore,
        regions: criteria.regions,
        telegramChatId: criteria.telegramChatId ?? null,
        notifyEnabled: criteria.notifyEnabled,
      }
    : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">투자 기준 및 알림 설정</h2>
        <SettingsForm initialCriteria={serializable} />
      </div>
    </div>
  )
}
