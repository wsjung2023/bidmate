'use client'

import { useState } from 'react'

type Props = {
  listingId: string
  hasAnalysis: boolean
}

type AnalyzeState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'completed'; score: number; recommendation: string }
  | { status: 'dropped'; reason: string }
  | { status: 'error'; message: string }

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_BUY: '강력 매수',
  BUY: '매수',
  NEUTRAL: '중립',
  PASS: '보류',
  AVOID: '기피',
}

const RECOMMENDATION_COLOR: Record<string, string> = {
  STRONG_BUY: 'bg-green-600 text-white',
  BUY: 'bg-green-500 text-white',
  NEUTRAL: 'bg-yellow-500 text-white',
  PASS: 'bg-gray-400 text-white',
  AVOID: 'bg-red-500 text-white',
}

export function AnalyzeButton({ listingId, hasAnalysis }: Props) {
  const [state, setState] = useState<AnalyzeState>({ status: 'idle' })

  async function handleAnalyze() {
    setState({ status: 'running' })

    try {
      const res = await fetch(`/api/listings/${listingId}/analyze`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? '분석 실패' })
        return
      }

      if (data.status === 'DROPPED') {
        setState({ status: 'dropped', reason: data.droppedReason ?? '기준 미충족' })
      } else if (data.status === 'COMPLETED') {
        setState({ status: 'completed', score: data.score, recommendation: data.recommendation ?? 'NEUTRAL' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setState({ status: 'error', message: '분석 중 오류가 발생했습니다.' })
      }
    } catch {
      setState({ status: 'error', message: '네트워크 오류' })
    }
  }

  if (state.status === 'completed') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-600 font-medium">분석 완료 — {state.score}점</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${RECOMMENDATION_COLOR[state.recommendation]}`}>
          {RECOMMENDATION_LABEL[state.recommendation] ?? state.recommendation}
        </span>
      </div>
    )
  }

  if (state.status === 'dropped') {
    return (
      <div className="text-red-500 text-sm">
        <span className="font-medium">분석 제외:</span> {state.reason}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-red-500 text-sm">{state.message}</span>
        <button
          onClick={handleAnalyze}
          className="text-sm text-blue-600 hover:underline"
        >
          재시도
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={state.status === 'running'}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        state.status === 'running'
          ? 'bg-blue-300 text-white cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {state.status === 'running' ? '분석 중... (1-2분 소요)' : hasAnalysis ? '재분석' : 'AI 분석 시작'}
    </button>
  )
}
