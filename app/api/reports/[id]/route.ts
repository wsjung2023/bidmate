import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      analysis: {
        include: {
          listing: true,
        },
      },
    },
  })

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(report)
}
