import { prisma } from '@/lib/db/prisma'
import type { Listing } from '@prisma/client'
import { runNormalizer } from '@/lib/agents/normalizer'
import { runDueDiligence } from '@/lib/agents/due-diligence'
import { runCommercial } from '@/lib/agents/commercial'
import { calculateFinancials } from '@/lib/agents/financials'
import { runRisk } from '@/lib/agents/risk'
import { runStrategy } from '@/lib/agents/strategy'
import { runReport } from '@/lib/agents/report'
import { calculateScore } from '@/lib/scoring/engine'
import { checkDropRules } from '@/lib/scoring/drop-rules'
import type { AgentOutputs } from '@/lib/agents/types'

export type PipelineResult = {
  listingId: string
  analysisId: string
  reportId?: string
  status: 'COMPLETED' | 'DROPPED' | 'FAILED'
  score?: number
  recommendation?: string
  dropped: boolean
  droppedReason?: string
  error?: string
}

export async function runPipeline(listing: Listing): Promise<PipelineResult> {
  const analysis = await prisma.analysis.create({
    data: {
      listingId: listing.id,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  try {
    // Step 1: Normalize
    const normalized = await runNormalizer(listing)

    // Step 2: Due Diligence (rights + license)
    const { rightsAnalysis, licenseCheck } = await runDueDiligence(listing)

    // Step 3: Commercial area
    const commercialArea = await runCommercial(listing)

    // Step 4: Financials (deterministic)
    const financials = calculateFinancials({
      minimumBid: Number(listing.minimumBid),
      area: listing.area ?? 200,
      commercialArea,
      estimatedRenovationCost: normalized.estimatedRenovationCost,
    })

    // Step 5: Check auto-drop rules before expensive agents
    const partialOutputs: Omit<AgentOutputs, 'riskFactors' | 'strategy'> = {
      rightsAnalysis,
      licenseCheck,
      commercialArea,
      financials,
    }

    const dropCheck = checkDropRules(
      { ...partialOutputs, riskFactors: { level: 'LOW', factors: [], summary: '' } },
      Number(listing.minimumBid),
      Number(listing.appraisalValue),
    )

    if (dropCheck.drop) {
      await Promise.all([
        prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            rightsAnalysis,
            licenseCheck,
            commercialArea,
            financials,
            status: 'DROPPED',
            completedAt: new Date(),
          },
        }),
        prisma.listing.update({
          where: { id: listing.id },
          data: { isDropped: true, droppedReason: dropCheck.reason },
        }),
      ])

      return {
        listingId: listing.id,
        analysisId: analysis.id,
        status: 'DROPPED',
        dropped: true,
        droppedReason: dropCheck.reason,
      }
    }

    // Step 6: Risk assessment
    const riskFactors = await runRisk(listing, partialOutputs as AgentOutputs)

    const outputs: AgentOutputs = { ...partialOutputs, riskFactors }

    // Step 7: Score
    const score = calculateScore(outputs)

    // Step 8: Strategy
    const strategy = await runStrategy(listing, outputs)
    outputs.strategy = strategy

    // Step 9: Report (uses premium model)
    const reportOutput = await runReport(listing, outputs, score)

    // Persist analysis
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        rightsAnalysis,
        licenseCheck,
        commercialArea,
        financials,
        riskFactors,
        strategy,
        score: score.total,
        scoreBreakdown: score.breakdown,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Persist report
    const report = await prisma.report.create({
      data: {
        analysisId: analysis.id,
        title: reportOutput.title,
        summary: reportOutput.summary,
        fullReport: reportOutput.fullReport,
        recommendedBid: BigInt(reportOutput.recommendedBid),
        expectedRoi: reportOutput.expectedRoi,
        riskLevel: reportOutput.riskLevel,
        recommendation: reportOutput.recommendation,
      },
    })

    // Update listing score cache
    await prisma.listing.update({
      where: { id: listing.id },
      data: { score: score.total },
    })

    return {
      listingId: listing.id,
      analysisId: analysis.id,
      reportId: report.id,
      status: 'COMPLETED',
      score: score.total,
      recommendation: reportOutput.recommendation,
      dropped: false,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    })

    return {
      listingId: listing.id,
      analysisId: analysis.id,
      status: 'FAILED',
      dropped: false,
      error: errorMessage,
    }
  }
}
