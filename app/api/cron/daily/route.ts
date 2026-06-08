import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { runPipeline } from '@/lib/pipeline/orchestrator'
import { sendTelegramMessage, formatListingAlert } from '@/lib/notifications/telegram'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const run = await prisma.pipelineRun.create({ data: { status: 'RUNNING' } })

  const listings = await prisma.listing.findMany({
    where: { isDropped: false, score: null },
    orderBy: { collectedAt: 'desc' },
    take: 50,
  })

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: { totalItems: listings.length },
  })

  let processed = 0
  let failed = 0
  let dropped = 0
  const highScoreResults: Array<{
    address: string
    listingType: string
    propertyType: string
    minimumBid: number
    score: number
    recommendation: string
    reportUrl: string
  }> = []

  for (const listing of listings) {
    const result = await runPipeline(listing)

    if (result.status === 'FAILED') {
      failed++
    } else if (result.status === 'DROPPED') {
      dropped++
    } else {
      processed++
      if (result.score !== undefined && result.score >= 70 && result.reportId) {
        highScoreResults.push({
          address: listing.address,
          listingType: listing.listingType,
          propertyType: listing.propertyType,
          minimumBid: Number(listing.minimumBid),
          score: result.score,
          recommendation: result.recommendation ?? 'NEUTRAL',
          reportUrl: `${process.env.NEXTAUTH_URL}/reports/${result.reportId}`,
        })
      }
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { processed, failed, dropped },
    })
  }

  if (highScoreResults.length > 0) {
    const usersWithNotifications = await prisma.investmentCriteria.findMany({
      where: { notifyEnabled: true, telegramChatId: { not: null } },
    })

    for (const userCriteria of usersWithNotifications) {
      if (!userCriteria.telegramChatId) continue
      const minScore = userCriteria.minScore

      for (const result of highScoreResults.filter((r) => r.score >= minScore)) {
        const msg = formatListingAlert(result)
        await sendTelegramMessage(userCriteria.telegramChatId, msg)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: failed === listings.length && listings.length > 0 ? 'FAILED' : 'COMPLETED',
      completedAt: new Date(),
    },
  })

  return NextResponse.json({
    runId: run.id,
    totalItems: listings.length,
    processed,
    failed,
    dropped,
    highScoreAlerts: highScoreResults.length,
  })
}
