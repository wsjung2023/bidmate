import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { collectCourtAuction } from '@/lib/collectors/court-auction'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await collectCourtAuction()
    return NextResponse.json({ success: true, ...stats })
  } catch (e) {
    console.error('[admin/collect] 수집 실패:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
