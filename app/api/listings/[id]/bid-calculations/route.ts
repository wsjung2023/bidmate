import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { calcForBid, calcMaxBid } from '@/lib/finance/bid-calculator'
import type { BidCalculation } from '@prisma/client'

// Mirrors BidCalculatorInput — every field required, finite numbers.
const InputSchema = z.object({
  appraisalValue: z.number().finite(),
  minimumBid: z.number().finite(),
  depositRate: z.number().finite(),
  loanRatio: z.number().finite(),
  loanRate: z.number().finite(),
  loanMonths: z.number().finite(),
  prepaymentFeeRate: z.number().finite(),
  loanExtraCost: z.number().finite(),
  targetSalePrice: z.number().finite(),
  targetRoi: z.number().finite(),
  baseWinRate: z.number().finite(),
  stepUnit: z.number().finite(),
  acquisitionTaxRate: z.number().finite(),
  legalFee: z.number().finite(),
  unpaidMgmtFee: z.number().finite(),
  courtFee: z.number().finite(),
  storageMgmtFee: z.number().finite(),
  evictionCost: z.number().finite(),
  repairCost: z.number().finite(),
  otherHoldingCost1: z.number().finite(),
  otherHoldingCost2: z.number().finite(),
  brokerageRate: z.number().finite(),
  transferTax: z.number().finite(),
})

const BodySchema = z.object({
  inputs: InputSchema,
  bidPrice: z.number().finite().optional(), // chosen bid; defaults to maxBid
  label: z.string().max(100).optional(),
})

function serialize(calc: BidCalculation) {
  return {
    ...calc,
    bidPrice: calc.bidPrice.toString(),
    maxBid: calc.maxBid.toString(),
    netProfit: calc.netProfit.toString(),
    investment: calc.investment.toString(),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { inputs, label } = parsed.data

  // Always recompute the snapshot server-side — never trust client-sent outputs.
  const maxBid = calcMaxBid(inputs)
  const bidPrice = parsed.data.bidPrice ?? Math.round(maxBid)
  const result = calcForBid(inputs, bidPrice)

  const calc = await prisma.bidCalculation.create({
    data: {
      listingId: id,
      userId: session.user.id ?? null,
      label: label ?? null,
      inputs,
      bidPrice: BigInt(Math.round(bidPrice)),
      maxBid: BigInt(Math.round(maxBid)),
      netProfit: BigInt(Math.round(result.netProfit)),
      investment: BigInt(Math.round(result.investment)),
      roi: result.roi,
      winRate: result.winRate,
    },
  })

  return NextResponse.json(serialize(calc), { status: 201 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const calcs = await prisma.bidCalculation.findMany({
    where: {
      listingId: id,
      OR: [{ userId: session.user.id }, { userId: null }],
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ calculations: calcs.map(serialize) })
}
