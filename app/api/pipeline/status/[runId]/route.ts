import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> | { runId: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { runId } = await params
  const run = await prisma.pipelineRun.findUnique({ where: { id: runId } })
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(run)
}
