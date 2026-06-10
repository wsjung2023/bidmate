import { auth, signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/listings', label: '매물 목록' },
  { href: '/map', label: '지도 보기' },
  { href: '/reports', label: '보고서' },
  { href: '/settings', label: '설정' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 브랜드 */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <span className="font-bold text-slate-900 text-base">BidMate</span>
            </Link>

            {/* 네비게이션 링크 */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 우측: 사용자 + 로그아웃 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-slate-200"
                />
              )}
              <span className="text-sm text-slate-500 max-w-[160px] truncate">
                {session.user?.name ?? session.user?.email}
              </span>
            </div>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button
                type="submit"
                className="text-sm text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
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
