import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { PRESETS } from '@/lib/llm/presets'
import type { ModelPreset } from '@/lib/llm/presets'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const config = await prisma.appConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', pipelinePreset: 'standard' },
    update: {},
  })

  return NextResponse.json({ pipelinePreset: config.pipelinePreset })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const preset = body.pipelinePreset as ModelPreset

  if (!PRESETS[preset]) {
    return NextResponse.json({ error: 'Invalid preset' }, { status: 400 })
  }

  const config = await prisma.appConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', pipelinePreset: preset },
    update: { pipelinePreset: preset },
  })

  return NextResponse.json({ pipelinePreset: config.pipelinePreset })
}
