import { auth, signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">부동산 리서치</span>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">대시보드</Link>
            <Link href="/listings" className="text-sm text-gray-600 hover:text-gray-900">매물 목록</Link>
            <Link href="/reports" className="text-sm text-gray-600 hover:text-gray-900">보고서</Link>
            <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">설정</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session.user.email}</span>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
