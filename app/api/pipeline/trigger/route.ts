import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { runPipeline } from '@/lib/pipeline/orchestrator'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await prisma.pipelineRun.create({
    data: { status: 'RUNNING' },
  })

  const listings = await prisma.listing.findMany({
    where: { isDropped: false, score: null },
    take: 20,
  })

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: { totalItems: listings.length },
  })

  // Run in background — do not await
  ;(async () => {
    let processed = 0
    let failed = 0
    let dropped = 0

    for (const listing of listings) {
      const result = await runPipeline(listing)
      if (result.status === 'FAILED') failed++
      else if (result.status === 'DROPPED') dropped++
      else processed++

      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { processed, failed, dropped },
      })
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: failed === listings.length ? 'FAILED' : dropped + failed > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
      },
    })
  })()

  return NextResponse.json({ runId: run.id, totalItems: listings.length })
}
