import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const CriteriaSchema = z.object({
  regions: z.array(z.string()).default([]),
  minBid: z.number().optional(),
  maxBid: z.number().optional(),
  minArea: z.number().optional(),
  maxArea: z.number().optional(),
  propertyTypes: z.array(z.string()).default([]),
  listingTypes: z.array(z.string()).default([]),
  minRoi: z.number().optional(),
  minScore: z.number().min(0).max(100).default(60),
  telegramChatId: z.string().optional(),
  notifyEnabled: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const criteria = await prisma.investmentCriteria.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ criteria })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CriteriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const criteria = await prisma.investmentCriteria.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
      minBid: parsed.data.minBid ? BigInt(parsed.data.minBid) : null,
      maxBid: parsed.data.maxBid ? BigInt(parsed.data.maxBid) : null,
      propertyTypes: parsed.data.propertyTypes as any,
      listingTypes: parsed.data.listingTypes as any,
    },
    update: {
      ...parsed.data,
      minBid: parsed.data.minBid ? BigInt(parsed.data.minBid) : null,
      maxBid: parsed.data.maxBid ? BigInt(parsed.data.maxBid) : null,
      propertyTypes: parsed.data.propertyTypes as any,
      listingTypes: parsed.data.listingTypes as any,
    },
  })

  return NextResponse.json({ criteria })
}
